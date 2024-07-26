const express = require('express')
const cors = require('cors');
const path = require('path')
const fs = require('fs')
const archiver = require('archiver')

const app = express()

// 中间件，用于解析 JSON 格式的请求体
app.use(express.json());
// 使用cors中间件 解决跨域
app.use(cors({
  origin: '*' // 指定允许的来源
}));

app.get('/getData', (req, res) => {
  console.log('req', req.query)
  const target = req.query
  // console.log('res', res)

  const directoryPath = path.join(__dirname, 'images')
  console.log('directoryPath', directoryPath)
  // node 访问文件系统
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan files!');
    }
    console.log('files', files)
    // const imageFiles = files.filter(file => path.parse(file).name in target);

    const imageFiles = files.filter(file => {
      let bol  = false
      for (const key in target) {
        if (file.includes(key)) {
          return bol = true
        } else {
          bol = false
        }
      }
      return bol
    })
    

    console.log('imageFiles', imageFiles)

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=files.zip');
    // 压缩包实例
    const archive = archiver('zip', {
      zlib: { level: 9 } // 压缩级别
    });

    // 压缩过程
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        // log warning
      } else {
        // throw error
        throw err;
      }
    });
    // 压缩报错日志
    archive.on('error', (err) => {
      throw err;
    });
    // 压缩res
    archive.pipe(res);

    const folderPath = 'images'

    imageFiles.forEach((file) => {
      console.log('filename', file)
      const baseName =  file.split('.')[0]
      const filePath = path.join(folderPath, file);

      let keyBaseName = '' 
      for (const key in target) {
        if (file.includes(key)) {
          keyBaseName = key
        }
      }
      // 压缩包中的文件名
      const downName = `${baseName}-${target[keyBaseName]}.png` 
      console.log('downName', downName)
      if (fs.existsSync(filePath)) {
        archive.append(fs.createReadStream(filePath), { name: downName });
      } else {
        console.log(`${file} does not exist`);
      }
    });
    // 返回压缩包文件流
    archive.finalize();
  });
})

// 开启服务， 监听3001端口
app.listen(3001, () => {
  console.log('Server started on port 3001')
})