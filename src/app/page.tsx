'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showCoordinates, setShowCoordinates] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  const [imageSettings, setImageSettings] = useState({
    width: 800,
    height: 600,
    rotation: 0,
    flip: 'none',
    crop: {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    }
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !previewUrl) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    setMousePosition({ x, y });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) return;

    const formData = new FormData();
    formData.append('image', selectedImage);

    // Create a settings object that includes cropEnabled flag
    const settingsToSend = {
      ...imageSettings,
      cropEnabled: cropEnabled
    };

    formData.append('settings', JSON.stringify(settingsToSend));

    try {
      const response = await fetch('http://localhost:5000/process-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error('Error processing image:', error);
    }
  };

  const rotationAngles = [0, 90, 180, 270, 360];

  return (
      <div className="min-h-screen bg-base-200 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-base-content mb-4">Resim Düzenleme Aracı</h1>
            <p className="text-xl text-base-content/70">Resminizi yükleyin ve düzenlemeye başlayın</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Sol Taraf - Form */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Resim Yükleme */}
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text text-lg font-medium">Resim Seç</span>
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="file-input file-input-bordered file-input-primary w-full h-16 text-lg"
                    />
                  </div>

                  {/* Boyut Ayarları */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-lg font-medium">Genişlik</span>
                      </label>
                      <div className="relative">
                        <input
                            type="number"
                            value={imageSettings.width}
                            onChange={(e) => setImageSettings({...imageSettings, width: parseInt(e.target.value)})}
                            className="input input-bordered w-full h-16 text-lg pr-12"
                            min="1"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">px</span>
                      </div>
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-lg font-medium">Yükseklik</span>
                      </label>
                      <div className="relative">
                        <input
                            type="number"
                            value={imageSettings.height}
                            onChange={(e) => setImageSettings({...imageSettings, height: parseInt(e.target.value)})}
                            className="input input-bordered w-full h-16 text-lg pr-12"
                            min="1"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">px</span>
                      </div>
                    </div>
                  </div>

                  {/* Döndürme */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-lg font-medium">Döndürme Açısı</span>
                      <span className="label-text-alt text-lg">{imageSettings.rotation}°</span>
                    </label>
                    <div className="flex gap-2 mb-4">
                      {rotationAngles.map((angle) => (
                          <button
                              key={angle}
                              type="button"
                              className={`btn btn-sm flex-1 ${imageSettings.rotation === angle ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => setImageSettings({...imageSettings, rotation: angle})}
                          >
                            {angle}°
                          </button>
                      ))}
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="360"
                        value={imageSettings.rotation}
                        onChange={(e) => setImageSettings({...imageSettings, rotation: parseInt(e.target.value)})}
                        className="range range-primary"
                        step="1"
                    />
                  </div>

                  {/* Çevirme */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-lg font-medium">Çevirme</span>
                    </label>
                    <select
                        className="select select-bordered w-full h-16 text-lg"
                        value={imageSettings.flip}
                        onChange={(e) => setImageSettings({...imageSettings, flip: e.target.value})}
                    >
                      <option value="none">Yok</option>
                      <option value="horizontal">Yatay Çevir</option>
                      <option value="vertical">Dikey Çevir</option>
                      <option value="both">Her İki Yönde Çevir</option>
                    </select>
                  </div>

                  {/* Kırpma Ayarları */}
                  <div className={`collapse collapse-arrow bg-base-200 ${cropEnabled ? 'collapse-open border-2 border-primary' : ''}`}>
                    <input
                        type="checkbox"
                        checked={cropEnabled}
                        onChange={(e) => setCropEnabled(e.target.checked)}
                    />
                    <div className="collapse-title text-lg font-medium">
                      Kırpma Ayarları {cropEnabled ? '(Etkin)' : '(Devre Dışı)'}
                    </div>
                    <div className="collapse-content">
                      <div className="alert alert-info mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>Koordinat sistemi <strong>sol üst köşeyi (0,0)</strong> referans alır. Önizleme üzerinde koordinatları görmek için fare ile resmin üzerine gelin.</span>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text text-lg">X Koordinatı (Soldan)</span>
                          </label>
                          <div className="relative">
                            <input
                                type="number"
                                value={imageSettings.crop.x}
                                onChange={(e) => setImageSettings({
                                  ...imageSettings,
                                  crop: {...imageSettings.crop, x: parseInt(e.target.value)}
                                })}
                                className="input input-bordered h-16 text-lg pr-12"
                                min="0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">px</span>
                          </div>
                        </div>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text text-lg">Y Koordinatı (Yukarıdan)</span>
                          </label>
                          <div className="relative">
                            <input
                                type="number"
                                value={imageSettings.crop.y}
                                onChange={(e) => setImageSettings({
                                  ...imageSettings,
                                  crop: {...imageSettings.crop, y: parseInt(e.target.value)}
                                })}
                                className="input input-bordered h-16 text-lg pr-12"
                                min="0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">px</span>
                          </div>
                        </div>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text text-lg">Kırpma Genişliği</span>
                          </label>
                          <div className="relative">
                            <input
                                type="number"
                                value={imageSettings.crop.width}
                                onChange={(e) => setImageSettings({
                                  ...imageSettings,
                                  crop: {...imageSettings.crop, width: parseInt(e.target.value)}
                                })}
                                className="input input-bordered h-16 text-lg pr-12"
                                min="1"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">px</span>
                          </div>
                        </div>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text text-lg">Kırpma Yüksekliği</span>
                          </label>
                          <div className="relative">
                            <input
                                type="number"
                                value={imageSettings.crop.height}
                                onChange={(e) => setImageSettings({
                                  ...imageSettings,
                                  crop: {...imageSettings.crop, height: parseInt(e.target.value)}
                                })}
                                className="input input-bordered h-16 text-lg pr-12"
                                min="1"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">px</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary w-full h-16 text-lg">
                    Resmi İşle
                  </button>
                </form>
              </div>
            </div>

            {/* Sağ Taraf - Önizleme */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-8">
                <h2 className="card-title text-2xl mb-6">Önizleme</h2>
                <div className="bg-base-200 rounded-lg overflow-hidden">
                  {previewUrl ? (
                      <div
                          className="relative w-full h-[600px]"
                          ref={imageRef}
                          onMouseMove={handleMouseMove}
                          onMouseEnter={() => setShowCoordinates(true)}
                          onMouseLeave={() => setShowCoordinates(false)}
                      >
                        <Image
                            src={previewUrl}
                            alt="Preview"
                            fill
                            style={{ objectFit: 'contain' }}
                            className="p-2"
                        />
                        {showCoordinates && (
                            <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-md text-sm">
                              X: {mousePosition.x}px, Y: {mousePosition.y}px
                            </div>
                        )}
                        {cropEnabled && previewUrl && (
                            <div className="absolute top-2 left-2 bg-primary/80 text-white px-3 py-1 rounded-md text-sm">
                              Kırpma: x={imageSettings.crop.x}px, y={imageSettings.crop.y}px,
                              genişlik={imageSettings.crop.width}px, yükseklik={imageSettings.crop.height}px
                            </div>
                        )}
                      </div>
                  ) : (
                      <div className="flex items-center justify-center h-[600px] text-base-content/60">
                        <div className="text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xl">Resim yükleyin veya işleyin</p>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}