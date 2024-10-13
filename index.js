const express = require('express')
const cors = require('cors');
const path = require('path')
const fs = require('fs')
const fsExtra = require('fs-extra');
const archiver = require('archiver')
const { clearDir } = require('./utils')

console.log('clearDir', clearDir)

const app = express()

const USER_HOME = process.env.HOME || process.env.USERPROFILE
// const directoryPath = path.join(USER_HOME, 'Desktop\\images')
const directoryPath = path.join(__dirname, 'images')


// 中间件，用于解析 JSON 格式的请求体
app.use(express.json());
// 使用cors中间件 解决跨域
app.use(cors({
  origin: '*' // 指定允许的来源
}));

app.get('/getData',  (req, res) => {
  const target = req.query
  // node 访问文件系统
  fs.readdir(directoryPath, async (err, files) => {
    if (err) {
      return res.status(500).send(err);
    }
    // const imageFiles = files.filter(file => path.parse(file).name in target);
    console.log('前端传过来的参数target', target)
    const existImagesObj = {} // 存在的图片
    const noExistImagesObj = {} // 不存在的图片
    const imageFiles = files.filter(file => {
      let bol  = false
      
      for (const key in target) {
        if (file.includes(key)) {
          existImagesObj[key] = target[key]
          return bol = true
        } else {
          noExistImagesObj[key] = target[key]
          bol = false
        }
      }
      return bol
    })

    // 新建一个文件夹
    const baseDir = path.join(__dirname, 'imagesTarget')
    const copyDir = path.join(__dirname, 'imagesTargetsCopy')
    if (fs.existsSync(baseDir)) { 
      clearDir(baseDir)
    }
    if (fs.existsSync(copyDir)) { 
      clearDir(copyDir)
    }
   
    await fsExtra.ensureDir(baseDir)
      
    // console.log('images文件中存在excel SKC的文件', imageFiles)
    // console.log('existImagesObj', existImagesObj)
    // console.log('noExistImagesObj', noExistImagesObj)

    const transformData = Object.keys(existImagesObj).reduce((acc,cur) => {
      const val = existImagesObj[cur]
      if (val in acc) {
        acc[val] = acc[val].concat(imageFiles.filter(item => item.includes(cur)))
      } else {
        acc[val] = imageFiles.filter(item => item.includes(cur))
      }
      return acc
    }, {})
    // 递归复制图片到中专文件夹
    let imageTotal = 0
    Object.keys(transformData).map(async (item) => {
      const ind = transformData[item].length
      imageTotal = imageTotal + item * ind
      const curDirName = `${item}.${ind}_共${imageTotal}`
      
      try {
        const newPath = `${baseDir}\\${curDirName}`
        // 这段代码会先检查文件夹是否存在，如果存在则清空文件夹内容；如果不存在则创建文件夹。
        if (fs.existsSync(newPath)) {
          fs.readdirSync(newPath).forEach((file) => {
            const curPath = path.join(newPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              fs.rmdirSync(curPath, { recursive: true });
            } else {
              fs.unlinkSync(curPath);
            }
          });
        } else {
          fs.mkdirSync(newPath);
        }
        // await fsExtra.ensureDir(newPath)
        transformData[item].forEach((element)=> {
          const sourcePath = `${directoryPath}\\${element}`
          const destinationPath = `${baseDir}\\${curDirName}\\${element}`
            // 复制文件
          fsExtra.copy(sourcePath, destinationPath);
         
        });
        console.log('文件夹创建成功!');
      } catch (err) {
        console.error('创建文件夹时发生错误:', err);
      }
    })

    const baseDirCopy = path.join(__dirname, `imagesTargetsCopy\\images_${imageTotal}`)

    await fsExtra.copy(baseDir, baseDirCopy);

    res.attachment('folder.zip');
    const archive = archiver('zip');
   
    // 监听归档流结束  
    archive.pipe(res)
    console.log('baseDir', baseDir)
    archive.directory(copyDir, false);
    // 返回压缩包文件流
    archive.finalize();
     // 压缩报错日志
    archive.on('error', (err) => {
      throw err;
    });
  });
})

app.get('/getGoodsData',  (req, res) => {
  const target = req.query
  // node 访问文件系统
  fs.readdir(directoryPath, async (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan files!');
    }
    const existImagesObj = {} // 存在的图片
    const noExistImagesObj = {} // 不存在的图片
    const imageFiles = files.filter(file => {
      let bol  = false
      for (const key in target) {
        if (file.includes(key)) {
          existImagesObj[key] = target[key]
          return bol = true
        } else {
          noExistImagesObj[key] = target[key]
          bol = false
        }
      }
      return bol
    })

    // 新建一个文件夹
    const subdirectoryName = 'imagesGoods'
    const baseDir = path.join(__dirname, subdirectoryName)
    const copyDir = path.join(__dirname, 'imagesGoodsCopy')
   
    if (fs.existsSync(baseDir)) { 
      clearDir(baseDir)
    }
    if (fs.existsSync(copyDir)) { 
      clearDir(copyDir)
    }
    await fsExtra.ensureDir(baseDir) // 确保目录存在  
    let imageTotal = 0
    const transformData = Object.keys(existImagesObj).map(async (item,index) => {
      const existArr = imageFiles.filter(fileName=> fileName.includes(item))
      const imageNum = Number(existImagesObj[item]) // 每张图片数量
      const subdirectoryPath = path.join(__dirname, subdirectoryName, `A${index + 1}-${item}-(${imageNum * existArr.length})`)
      imageTotal += imageNum * existArr.length
      await  fsExtra.ensureDir(subdirectoryPath)
      existArr.forEach(async (element, index) => {
        const sourcePath = `${directoryPath}\\${element}`
        const imageName = element.split('.')[0] // 图片名称
        const postfixName = element.split('.')[1] // 图片后缀
        const filePath = `${subdirectoryPath}\\${imageName}_${imageNum}.${postfixName}`
        await fsExtra.copy(sourcePath, filePath)
      })
    })

    const baseDirCopy = path.join(__dirname, `imagesGoodsCopy\\images_${imageTotal}`)
    await fsExtra.copy(baseDir, baseDirCopy);

    res.attachment('folder.zip');
    const archive = archiver('zip');
   
    // 监听归档流结束  
    archive.pipe(res)
    archive.directory(copyDir, false);
    // 返回压缩包文件流
    archive.finalize();
     // 压缩报错日志
    archive.on('error', (err) => {
      throw err;
    });

  });
})

app.get('/getFootGoodsData', (req, res) => {
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
      // const downName = `${baseName}-${target[keyBaseName]}.jpg` 
      const downName = `${target[keyBaseName]}(个).jpg` 
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

app.get('/getNoExistData', async (req, res) => {
  const target = req.query
  // node 访问文件系统
  fs.readdir(directoryPath, async (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan files!');
    }
    const existImagesObj = {} // 存在的图片
    const noExistImagesObj = {} // 不存在的图片
  

    Object.keys(target).map(item => {
      if (files.some(file => file.includes(item))) {
        existImagesObj[item] = item
      } else {
        noExistImagesObj[item] = item
      }
    })

    const data = {
      code: 200,
      data: noExistImagesObj
    }
    res.json(data);
  });
})


// 开启服务， 监听3001端口
app.listen(3001, () => {
  console.log('Server started on port 3001')
})