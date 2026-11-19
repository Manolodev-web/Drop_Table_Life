import { render } from 'preact';
import App from './App.jsx';
import './index.css';
import './fx/fx.js'   // expone window.fx

render(<App />, document.getElementById('app'));