import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  resetKey: string;
}

interface State { failed: boolean; resetKey: string }

export default class DeferredErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey };
  }

  componentDidCatch(error: unknown) {
    console.error('Deferred interface failed to load', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
