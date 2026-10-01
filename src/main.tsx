import { render } from 'preact';
import { App } from './App';
import './styles.css';
import { trackInputModality } from './lib/inputModality';

trackInputModality();
render(<App />, document.getElementById('app')!);
