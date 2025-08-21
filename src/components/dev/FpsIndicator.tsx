import { Component, ReactNode } from "react";

interface FpsIndicatorProps {
  className?: string;
  isVisible?: boolean;
}

interface FpsIndicatorState {
  fps: number;
}

export class FpsIndicator extends Component<FpsIndicatorProps, FpsIndicatorState> {
  private frameCount = 0;
  private lastTime = performance.now();
  private animationFrameId: number | null = null;
  private updateTimeoutId: number | null = null;

  constructor(props: FpsIndicatorProps) {
    super(props);
    this.state = { fps: 0 };
  }

  componentDidMount() {
    if (this.props.isVisible) {
      this.startFpsCalculation();
    }
  }

  componentDidUpdate(prevProps: FpsIndicatorProps) {
    if (prevProps.isVisible !== this.props.isVisible) {
      if (this.props.isVisible) {
        this.startFpsCalculation();
      } else {
        this.stopFpsCalculation();
      }
    }
  }

  componentWillUnmount() {
    this.stopFpsCalculation();
  }

  private startFpsCalculation = () => {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.calculateFPS();
    this.scheduleUpdate();
  };

  private stopFpsCalculation = () => {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.updateTimeoutId) {
      clearTimeout(this.updateTimeoutId);
      this.updateTimeoutId = null;
    }
  };

  private calculateFPS = () => {
    if (!this.props.isVisible) return;
    
    this.frameCount++;
    this.animationFrameId = requestAnimationFrame(this.calculateFPS);
  };

  private updateFPS = () => {
    if (!this.props.isVisible) return;

    const now = performance.now();
    const deltaTime = now - this.lastTime;
    
    if (deltaTime >= 1000) {
      const currentFps = Math.round((this.frameCount * 1000) / deltaTime);
      
      if (Math.abs(currentFps - this.state.fps) >= 1) {
        this.setState({ fps: currentFps });
      }
      
      this.frameCount = 0;
      this.lastTime = now;
    }

    this.scheduleUpdate();
  };

  private scheduleUpdate = () => {
    this.updateTimeoutId = setTimeout(this.updateFPS, 500);
  };

  private getFpsColor = (fps: number): string => {
    if (fps >= 55) return "var(--syntax-string)";
    if (fps >= 30) return "var(--syntax-heading-h3)";
    return "var(--theme-destructive)";
  };

  render(): ReactNode {
    const { className = "", isVisible = false } = this.props;
    const { fps } = this.state;

    if (!isVisible) return null;

    const containerStyle = {
      backgroundColor: "var(--theme-muted)",
      border: "1px solid var(--theme-border)",
      color: this.getFpsColor(fps),
      backdropFilter: "blur(8px)",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    };

    return (
      <div 
        className={`px-2 py-1 rounded text-xs font-mono select-none pointer-events-none ${className}`}
        style={containerStyle}
      >
        {fps} FPS
      </div>
    );
  }
}