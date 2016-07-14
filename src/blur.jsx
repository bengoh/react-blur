import React from 'react';
import ReactDOM from 'react-dom';
import PureRenderMixin from 'react-addons-pure-render-mixin';
const stackBlurImage = require('../lib/StackBlur.js');

// ref http://stackoverflow.com/q/470832
function getAbsolutePath(path) {
  const a = document.createElement('a');
  a.href = path;
  return a.href;
}

export default class ReactBlur extends React.Component {
  static propTypes = {
    img           : React.PropTypes.string.isRequired,
    blurRadius    : React.PropTypes.number,
    resizeInterval: React.PropTypes.number,
    className     : React.PropTypes.string,
    children      : React.PropTypes.any,
    onLoadFunction: React.PropTypes.func
  };

  static defaultProps = {
    blurRadius    : 0,
    resizeInterval: 128,
    onLoadFunction: () => {}
  };

  constructor(props) {
    super(props);

    this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.resize.bind(this));

    // initialize state
    this.syncProps(this.props);
    this.syncDimensions();
  }

  componentWillUnmount() {
    this._unmounted = true;
    window.removeEventListener('resize', this.resize.bind(this));
  }

  componentWillReceiveProps(nextProps) {
    this.syncProps(nextProps);
  }

  componentWillUpdate(nextProps, nextState) {
    // detect changes in state and inform componentWillUpdate to perform
    // canvas rerendering if needed
    const fields = ['imgSrc', 'blurRadius', 'width', 'height'];
    this.hasDirty = !this.state || fields.some(field => this.state[field] !== nextState[field]);
  }

  componentDidUpdate() {
    if (this.hasDirty) {
      this.hasDirty = false;
      this.loadImage(this.state.imgSrc).then((event) => {
        if (event) {
          this.props.onLoadFunction(event);
        }

        const canvas = ReactDOM.findDOMNode(this.refs.canvas);
        canvas.height = this.state.height;
        canvas.width = this.state.width;
        stackBlurImage(this.img, canvas, this.state.blurRadius, this.state.width, this.state.height);
      });
    }
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      if (this.img && this.img.src === src) {
        return resolve(); // no event, no change in image
      } else if (!this.img) {
        this.img           = new Image();
      }

      this.img.crossOrigin = 'Anonymous';
      this.img.src         = src;
      this.img.onload      = (event) => {
        resolve(event);
      };
      this.img.onerror     = (event) => {
        this.img.src = '';
        resolve(event);
      };
    });
  }

  resize() {
    const now        = new Date().getTime();
    const threshold = this.props.resizeInterval;

    if (this.last && now < this.last + threshold) {
      clearTimeout(this.deferTimer);
      this.deferTimer = setTimeout(() => {
        this.last = now;
        this.syncDimensions();
      }, threshold);
    } else {
      this.last = now;
      this.syncDimensions();
    }
  }

  syncDimensions() {
    if (this._unmounted) {
      return;
    }

    const container = ReactDOM.findDOMNode(this);
    this.setState({
      height: container.offsetHeight,
      width: container.offsetWidth
    });
  }

  syncProps(props) {
    this.setState({
      blurRadius: props.blurRadius,
      imgSrc: getAbsolutePath(props.img)
    });
  }

  render() {
    var { className, children, canvasStyle, ...other } = this.props;
    var classes = 'react-blur';

    if (className) {
      classes += ' ' + className;
    }

    return (
      <div {...other} className={classes}>
        <canvas className='react-blur-canvas' style={canvasStyle} ref='canvas' />
        {children}
      </div>
    );
  }
};
