/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  let renderer: any;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await new Promise(resolve => setTimeout(resolve, 50));
  });
  expect(renderer).toBeDefined();

  await ReactTestRenderer.act(async () => {
    renderer.unmount();
    await new Promise(resolve => setTimeout(resolve, 50));
  });
});
