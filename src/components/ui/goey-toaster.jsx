"use client";

import { GooeyToaster as Toaster } from 'goey-toast';

export function GooeyToaster(props) {
  return <Toaster position="top-right" {...props} />;
}
