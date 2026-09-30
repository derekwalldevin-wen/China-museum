import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onError: () => void;
}

interface State {
  failed: boolean;
}

export default class MapErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
