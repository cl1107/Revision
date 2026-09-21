import type { ElementBounds } from '@gpuix/react';
import { expect } from 'bun:test';

export type AnyBounds = ElementBounds | number[] | null | undefined;

export function getBoundsCenter(bounds: AnyBounds): { x: number; y: number } {
  expect(bounds).toBeTruthy();
  if (!bounds) {
    throw new Error('Expected bounds to be present');
  }
  if (Array.isArray(bounds)) {
    return {
      x: bounds[0] + bounds[2] / 2,
      y: bounds[1] + bounds[3] / 2,
    };
  }
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function getBoundsDimensions(bounds: AnyBounds): { x: number; y: number; width: number; height: number } {
  expect(bounds).toBeTruthy();
  if (!bounds) {
    throw new Error('Expected bounds to be present');
  }
  if (Array.isArray(bounds)) {
    return {
      x: bounds[0],
      y: bounds[1],
      width: bounds[2],
      height: bounds[3],
    };
  }
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
}

export interface ClickableRenderer {
  findByTestId(id: string): { id: number } | undefined;
  getElementBounds(id: number): ElementBounds | number[] | null;
  nativeSimulateClick(x: number, y: number): void;
}

export function simulateClick(renderer: ClickableRenderer, testId: string): void {
  const node = renderer.findByTestId(testId);
  expect(node).toBeTruthy();
  const bounds = node ? renderer.getElementBounds(node.id) : null;
  const center = getBoundsCenter(bounds);
  renderer.nativeSimulateClick(center.x, center.y);
}
