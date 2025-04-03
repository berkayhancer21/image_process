from flask import Flask, request, send_file
from flask_cors import CORS
import cv2 as cv
import numpy as np
import io
import json
import os

app = Flask(__name__)
CORS(app)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def process_image(image_bytes, settings):
    # Bytes'ı numpy dizisine dönüştür
    nparr = np.frombuffer(image_bytes, np.uint8)
    # Numpy dizisini OpenCV görüntüsüne dönüştür
    img = cv.imdecode(nparr, cv.IMREAD_COLOR)

    # Boyutlandırma işlemi
    if 'width' in settings and 'height' in settings:
        width = int(settings['width'])
        height = int(settings['height'])
        # OpenCV'nin interpolation yöntemlerini kullan
        if width > img.shape[1] or height > img.shape[0]:
            # Büyütme için INTER_CUBIC
            img = cv.resize(img, (width, height), interpolation=cv.INTER_CUBIC)
        else:
            # Küçültme için INTER_AREA
            img = cv.resize(img, (width, height), interpolation=cv.INTER_AREA)

    # Döndürme işlemi
    if 'rotation' in settings:
        angle = float(settings['rotation'])

        # Görüntünün merkezi
        height, width = img.shape[:2]
        center = (width // 2, height // 2)

        # 90 derecelik dönüşler için özel işlem
        if angle in [90, 180, 270]:
            if angle == 90:
                img = cv.rotate(img, cv.ROTATE_90_CLOCKWISE)
            elif angle == 180:
                img = cv.rotate(img, cv.ROTATE_180)
            elif angle == 270:
                img = cv.rotate(img, cv.ROTATE_90_COUNTERCLOCKWISE)
        else:
            # Diğer açılar için normal döndürme
            rotation_matrix = cv.getRotationMatrix2D(center, -angle, 1.0)  # Açıyı negatif alıyoruz

            # Yeni boyutları hesapla
            abs_cos = abs(rotation_matrix[0, 0])
            abs_sin = abs(rotation_matrix[0, 1])
            new_width = int(height * abs_sin + width * abs_cos)
            new_height = int(height * abs_cos + width * abs_sin)

            # Döndürme matrisini güncelle
            rotation_matrix[0, 2] += new_width / 2 - center[0]
            rotation_matrix[1, 2] += new_height / 2 - center[1]

            # Görüntüyü döndür
            img = cv.warpAffine(img, rotation_matrix, (new_width, new_height),
                                 flags=cv.INTER_LINEAR, borderMode=cv.BORDER_CONSTANT,
                                 borderValue=(255, 255, 255))

    # Çevirme işlemi
    if 'flip' in settings:
        if settings['flip'] == 'horizontal':
            img = cv.flip(img, 1)  # 1 = yatay çevirme
        elif settings['flip'] == 'vertical':
            img = cv.flip(img, 0)  # 0 = dikey çevirme
        elif settings['flip'] == 'both':
            img = cv.flip(img, -1)  # -1 = hem yatay hem dikey çevirme

    # Kırpma işlemi - cropEnabled değeri true olduğunda etkinleştir
    if 'cropEnabled' in settings and settings['cropEnabled'] and 'crop' in settings:
        crop_settings = settings['crop']
        if all(key in crop_settings for key in ['x', 'y', 'width', 'height']):
            x = int(crop_settings['x'])
            y = int(crop_settings['y'])
            width = int(crop_settings['width'])
            height = int(crop_settings['height'])

            # Kırpma sınırlarını kontrol et
            img_height, img_width = img.shape[:2]
            x = max(0, min(x, img_width))
            y = max(0, min(y, img_height))
            width = max(0, min(width, img_width - x))
            height = max(0, min(height, img_height - y))

            img = img[y:y + height, x:x + width]

    # OpenCV BGR'den RGB'ye dönüştür
    img = cv.cvtColor(img, cv.COLOR_BGR2RGB)
    return img

@app.route('/process-image', methods=['POST'])
def process_image_route():
    try:
        if 'image' not in request.files:
            return {'error': 'No image file provided'}, 400
        
        file = request.files['image']
        if file.filename == '' or not allowed_file(file.filename):
            return {'error': 'Invalid file type'}, 400
        
        # Ayarları JSON'dan al
        settings = request.form.get('settings')
        if not settings:
            return {'error': 'No settings provided'}, 400
        
        settings = json.loads(settings)
        
        # Resmi işle
        processed_image = process_image(file.read(), settings)
        
        # NumPy dizisini PNG formatında byte dizisine dönüştür
        is_success, buffer = cv.imencode('.png', cv.cvtColor(processed_image, cv.COLOR_RGB2BGR))
        if not is_success:
            return {'error': 'Failed to encode image'}, 500
        
        # BytesIO nesnesine dönüştür
        img_io = io.BytesIO(buffer.tobytes())
        
        return send_file(img_io, mimetype='image/png')
    
    except Exception as e:
        return {'error': str(e)}, 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 