'use client';

import React, { useEffect, useRef, useState } from 'react';

// Shared loaders (so модель грузится 1 раз для всех инстансов)
let libsPromise = null;
let netPromise = null;

async function loadBodyPix() {
  if (!libsPromise) {
    libsPromise = Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/body-pix'),
    ]);
  }
  const [tf, bodyPix] = await libsPromise;
  try { await tf.setBackend('webgl'); await tf.ready(); } catch {}
  if (!netPromise) {
    netPromise = bodyPix.load({ architecture: 'MobileNetV1', outputStride: 16, multiplier: 0.75, quantBytes: 2 });
  }
  const net = await netPromise;
  return { tf, bodyPix, net };
}

// Lightweight wrapper around BodyPix to cut out the person from an image at runtime
// Falls back to showing the original image if the model cannot be loaded

export default function SmartCutoutImage({ src, width = 300, height = 300, className, alt = 'avatar' }) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function run() {
      try {
        const { bodyPix, net } = await loadBodyPix();

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Не показываем исходное изображение до готовности маски,
        // чтобы избежать "плохой" обрезки до загрузки модели
        ctx.clearRect(0, 0, width, height);

        const segmentation = await net.segmentPerson(img, {
          internalResolution: 'high',
          segmentationThreshold: 0.82,
        });

        // Make foreground opaque, background transparent for proper cutout
        const mask = bodyPix.toMask(
          segmentation,
          { r: 255, g: 255, b: 255, a: 255 },
          { r: 0, g: 0, b: 0, a: 0 }
        );

        // Compose foregroud only
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = img.width;
        maskCanvas.height = img.height;
        const mctx = maskCanvas.getContext('2d');
        mctx.putImageData(mask, 0, 0);

        // Рисуем изображение и применяем маску без размытия — чтобы не было ореола
        ctx.save();
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(maskCanvas, 0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      } catch (e) {
        console.warn('[SmartCutoutImage] Fallback to plain image:', e);
        setFailed(true);
      }
    }
    run();
    return () => { isCancelled = true; };
  }, [src, width, height]);

  if (failed) {
    return (
      // Fallback to native img element (so we are independent of next/image here)
      <img src={src} alt={alt} width={width} height={height} className={className} style={{ objectFit: 'cover' }} />
    );
  }

  return <canvas ref={canvasRef} className={className} width={width} height={height} aria-label={alt} />;
}


