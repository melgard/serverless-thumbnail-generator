import {S3Event, S3Handler} from 'aws-lambda';
import 'source-map-support/register';
import {S3} from "aws-sdk";

const GM = require('gm');
const gm = GM.subClass({imageMagik: true});
const s3 = new S3({apiVersion: '2006-03-01'})


const getFileExtension = filename => {
  const ext = /^.+\.([^.]+)$/.exec(filename);
  return ext == null ? '' : ext[1];
}

const resize = async (buf, ext = 'jpg', width = 300, height = 300) => new Promise((resolve, reject) => {
  gm(buf).resize(width, height)
    .toBuffer(ext, (err, buffer) => {
      if (err) {
        return reject(err);
      }
      return resolve(buffer);
    });
})

export const thumbnailGenerator:S3Handler = async (event: S3Event, _context) => {
  const [firstEvent] = event.Records;
  const [folder, tenant, fileName] = firstEvent.s3.object.key.split('/');
  const ext = getFileExtension(fileName).toUpperCase();

  // pictures/tenant-1/foto.jpg
  // Si el nombre incluye thumbs salgo porque ya fue escalada
  if(fileName.includes('thumbs')){
    return _context.done();
  }

  const params = {
    Bucket: firstEvent.s3.bucket.name,
    Key: firstEvent.s3.object.key
  }
  const picture = await s3.getObject(params).promise();
  const fileResized = await resize(picture.Body, ext);
  const uploaded = await s3.putObject({
    Bucket: firstEvent.s3.bucket.name,
    Body: fileResized,
    Key: `${folder}/${tenant}/thumbs/${fileName}`
  }).promise();
  console.log(uploaded);
  _context.done();
};

