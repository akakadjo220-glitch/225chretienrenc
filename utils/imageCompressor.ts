/**
 * Utilitaire de compression d'images côté client (Canvas / JPEG)
 * Compresse automatiquement toute photo à moins de 3 Mo (max width/height 1920px)
 */

export async function compressImage(file: File, maxMb = 3, maxWidth = 1920, maxHeight = 1920): Promise<File> {
  // Si le fichier fait déjà moins de 1 Mo, on ne compresse pas inutilement
  if (file.size <= 1 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compression progressive avec qualité 0.85
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            // Si toujours supérieur à 3 Mo, on réduit encore la qualité à 0.70
            if (compressedFile.size > maxMb * 1024 * 1024) {
              canvas.toBlob(
                (blob2) => {
                  if (!blob2) return resolve(compressedFile);
                  const finalFile = new File([blob2], compressedFile.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
                  resolve(finalFile);
                },
                'image/jpeg',
                0.70
              );
            } else {
              resolve(compressedFile);
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
