const sharp = require('sharp');
const path = require('path');

const maskPath = path.join(__dirname, 'objects', 'ar-storage', '8cbdf39d-4414-4340-b241-0bfff6f90334', 'mask-0.png');

sharp(maskPath)
  .metadata()
  .then(metadata => {
    console.log('Mask metadata:', JSON.stringify(metadata, null, 2));
    
    return sharp(maskPath)
      .raw()
      .toBuffer({ resolveWithObject: true });
  })
  .then(({ data, info }) => {
    // Check first few pixels
    console.log('\nFirst pixel (RGBA):', [data[0], data[1], data[2], data[3]]);
    console.log('Center pixel (RGBA):', [
      data[info.width * Math.floor(info.height/2) * info.channels],
      data[info.width * Math.floor(info.height/2) * info.channels + 1],
      data[info.width * Math.floor(info.height/2) * info.channels + 2],
      data[info.width * Math.floor(info.height/2) * info.channels + 3]
    ]);
    
    // Count transparent vs opaque pixels
    let transparent = 0, opaque = 0, white = 0, black = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a < 128) transparent++;
      else opaque++;
      
      if (r > 200 && g > 200 && b > 200) white++;
      if (r < 50 && g < 50 && b < 50) black++;
    }
    
    console.log('\nPixel stats:');
    console.log('Transparent:', transparent, 'Opaque:', opaque);
    console.log('White:', white, 'Black:', black);
  })
  .catch(console.error);
