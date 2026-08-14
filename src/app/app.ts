import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
})
export class App {
  protected readonly introHidden = signal(false);
  protected readonly revealed = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly timeouts: number[] = [];
  private honeycombInterval?: number;

  constructor() {
    afterNextRender(() => this.initializePage());
    this.destroyRef.onDestroy(() => this.clearTimers());
  }

  private initializePage(): void {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      this.introHidden.set(true);
      this.revealed.set(true);
      this.timeouts.push(window.setTimeout(() => this.buildHoneycomb(true), 0));
    } else {
      this.timeouts.push(
        window.setTimeout(() => {
          this.introHidden.set(true);
          this.revealed.set(true);
          this.timeouts.push(window.setTimeout(() => this.buildHoneycomb(false), 0));
        }, 1250),
      );
    }
  }

  private buildHoneycomb(reducedMotion: boolean): void {
    const svg = this.host.nativeElement.querySelector<SVGSVGElement>('#hexbg');
    if (!svg) return;

    const namespace = 'http://www.w3.org/2000/svg';
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const compactViewport = viewportWidth <= 560;
    const radius = compactViewport ? 50 : 58;
    const hexWidth = Math.sqrt(3) * radius;
    const verticalStep = radius * 1.5;

    svg.setAttribute('viewBox', `0 0 ${viewportWidth} ${viewportHeight}`);

    const columns = Math.ceil(viewportWidth / hexWidth) + 2;
    const rows = Math.ceil(viewportHeight / verticalStep) + 2;

    for (let row = -1; row < rows; row += 1) {
      const y = row * verticalStep;
      const xOffset = row % 2 === 0 ? 0 : hexWidth / 2;

      for (let column = -1; column < columns; column += 1) {
        const x = column * hexWidth + xOffset;
        const polygon = document.createElementNS(namespace, 'polygon');
        const glows = Math.random() < 0.4;
        const perimeter = Math.round(radius * 6);

        polygon.setAttribute('points', this.hexPoints(x, y, radius));
        polygon.setAttribute('class', 'hexcell');
        polygon.setAttribute('stroke-dasharray', `${perimeter}`);
        polygon.setAttribute('stroke-dashoffset', `${perimeter}`);

        if (glows) {
          polygon.style.animationDelay = `0s, 2.6s, ${((x + y) % 9).toFixed(1)}s`;
        }

        svg.appendChild(polygon);

        if (reducedMotion) {
          polygon.style.opacity = '0.32';
          polygon.style.fillOpacity = '0.045';
        } else {
          this.timeouts.push(
            window.setTimeout(
              () => polygon.classList.add(glows ? 'glow' : 'drawn'),
              400 + Math.random() * 5200,
            ),
          );
        }
      }
    }

    this.addSignalMotif(svg, namespace, viewportWidth, viewportHeight, reducedMotion);

    if (!reducedMotion) {
      this.honeycombInterval = window.setInterval(() => {
        const cells = svg.querySelectorAll<SVGPolygonElement>('.hexcell');
        for (let index = 0; index < 3 && cells.length > 0; index += 1) {
          const cell = cells[Math.floor(Math.random() * cells.length)];
          cell.classList.remove('drawn');
          void cell.getBoundingClientRect();
          cell.classList.add('drawn');
        }
      }, 2600);
    }
  }

  private addSignalMotif(
    svg: SVGSVGElement,
    namespace: string,
    viewportWidth: number,
    viewportHeight: number,
    reducedMotion: boolean,
  ): void {
    const compactViewport = viewportWidth <= 560;
    const signalX = viewportWidth * (compactViewport ? 0.82 : 0.8);
    const signalY = viewportHeight * (compactViewport ? 0.58 : 0.6);
    const lineX = signalX - (compactViewport ? Math.min(104, viewportWidth * 0.3) : 150);

    const line = document.createElementNS(namespace, 'line') as SVGLineElement;
    line.setAttribute('x1', `${lineX}`);
    line.setAttribute('y1', `${signalY}`);
    line.setAttribute('x2', `${signalX}`);
    line.setAttribute('y2', `${signalY}`);
    line.setAttribute('class', 'signal-line');
    svg.appendChild(line);

    const dots = [lineX, signalX].map((x) => {
      const dot = document.createElementNS(namespace, 'circle') as SVGCircleElement;
      dot.setAttribute('cx', `${x}`);
      dot.setAttribute('cy', `${signalY}`);
      dot.setAttribute('r', compactViewport ? '4' : '5');
      dot.setAttribute('class', 'signal-dot');
      svg.appendChild(dot);
      return dot;
    });

    const rings = (compactViewport ? [13, 23, 33] : [16, 28, 40]).map((radius) => {
      const ring = document.createElementNS(namespace, 'circle') as SVGCircleElement;
      ring.setAttribute('cx', `${signalX}`);
      ring.setAttribute('cy', `${signalY}`);
      ring.setAttribute('r', `${radius}`);
      ring.setAttribute('class', 'signal-ring');
      svg.appendChild(ring);
      return ring;
    });

    const showSignal = () => {
      line.style.opacity = '0.55';
      dots.forEach((dot) => (dot.style.opacity = '0.8'));
      rings.forEach((ring, index) => {
        ring.style.opacity = '0.4';
        if (!reducedMotion) {
          ring.style.animation = `ringPulse 3.6s ease-out ${index * 0.5}s infinite`;
        }
      });
    };

    if (reducedMotion) {
      showSignal();
    } else {
      this.timeouts.push(window.setTimeout(showSignal, 1500));
    }
  }

  private hexPoints(centerX: number, centerY: number, radius: number): string {
    return Array.from({ length: 6 }, (_, index) => {
      const angle = (Math.PI / 180) * (60 * index - 90);
      return `${(centerX + radius * Math.cos(angle)).toFixed(1)},${(
        centerY + radius * Math.sin(angle)
      ).toFixed(1)}`;
    }).join(' ');
  }

  private clearTimers(): void {
    this.timeouts.forEach((timer) => window.clearTimeout(timer));
    if (this.honeycombInterval !== undefined) {
      window.clearInterval(this.honeycombInterval);
    }
  }
}
