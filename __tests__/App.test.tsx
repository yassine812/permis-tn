/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  let renderer: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  expect(JSON.stringify(renderer!.toJSON())).toContain('Mon agenda');
  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
}, 30000);
