//引入所需模块
var express = require('express')
var bodyParser = require('body-parser')
var multer = require('multer')
var fs = require('fs')
var cookieParser = require('cookie-parser')

//存储上传的文件
var storage = multer.diskStorage({
    //设置存储的文件路径
    destination: 'questions',
    //文件名称
    filename: function (req, file, cb) {
        var username = req.cookies.username
        cb(null, username + '.jpg')
    }
})
//文件上传设置
var uploads = multer({ storage: storage })

//创建实例化对象
var app = express()
var form = multer()

//设置中间件
app.use( express.static('wwwroot') )
app.use( bodyParser.urlencoded( { extended:false } ))
app.use(cookieParser())

//处理注册的请求
app.post('/user/register', function (req, res) {
    //在req.body中添加IP和注册日期
    req.body.ip = req.ip;
    req.body.date = new Date()

    function send(code,message){
        res.status(200).json({code,message})
    }

    //保存注册的信息至某个文件夹内：用户名作为文件名存在
    //先判断文件夹是否存在，如果存在，保存文件；如果不存在，则创建文件夹，保存文件
    console.log( req.body );
    var fileName = 'user/' + req.body.username + '.txt';
    function saveFile(){
        fs.exists(fileName, function (exists) {
            if( exists ){
                //res.send('该用户已注册')
                send('registered','该用户已注册')
            } else {
                fs.appendFile(fileName, JSON.stringify(req.body) , function (error) {
                    if(error){
                        //res.send('系统错误1')
                        send('file error','系统错误1')
                    } else {
                        //res.send('恭喜，注册成功，请登录...')
                        send('success','恭喜，注册成功，请登录...')
                    }
                })
            }
        })
    }
    fs.exists('user', function (exists) {
        if( !exists ){
            fs.mkdirSync('user');
            saveFile()
        } else {
            saveFile()
        }
    })
});

//处理登录的请求
app.post("/user/login", function (req, res) {
//    验证当前用户名是否存在，如果不存在，提示未注册，如果存在，提示密码错误
    function send(code,message){
        res.status(200).json({code,message})
    }
    var fileName = 'user/' + req.body.username + '.txt'
    fs.exists(fileName, function (ex) {
        if( !ex ){
            send('none','该用户未注册')
        } else {
            fs.readFile(fileName, function (error, data) {
                if(error){
                    send('file error','系统错误2')
                } else {
                    var user = JSON.parse(data)
                    if(user.pwd = req.body.pwd){
                        res.cookie('username',req.body.username)
                        send('success','登录成功')
                    } else{
                        send('sign fail','密码错误')
                    }
                }
            })
        }
    })
})
//退出请求处理--清除cookie
app.get('/user/signout', function (req, res) {
    res.clearCookie('username')
    res.status(200).json({'code':'success'})
})
//文件上传请求
app.post('/user/photo',uploads.single('photo'), function (req, res) {
    res.send('上传成功')
})

//处理提问请求
app.post('/saveAsk', function (req, res) {
    var username = req.cookies.username
    console.log(req.body)
//    把当前提问的内容保存至某个文件中，文件名以当前时间取名，便于查询及后期的回答
//    设置时间+IP
    var time = new Date()
    req.body.ip = req.ip
    req.body.time = time
    req.body.username = username
//    封装返回服务器信息的方法
    function send(code,message){
        res.status(200).json({code,message})
    }
//    封装保存文件的方法
    function saveFile(){
    //    设置文件名 -- 以当前时间取名
        var fileName = 'questions/' + time.getTime() + '.txt'
        fs.appendFile(fileName,JSON.stringify(req.body), function (error) {
            if(error){
                send('fail','保存文件失败')
            } else {
                send('success','问题提交成功')
            }
        })
    }
    fs.exists('questions', function (ex) {
        if( !ex ){
            fs.mkdirSync('questions')
            saveFile()
        } else {
            saveFile()
        }
    })
})
//首页获取提问的内容信息
app.get('/questions', function (req, res) {
    function send(code,message,questions){
        //code:读取是否成功，message:是否成功相对应的信息，questions:读到的文件的内容数据
        res.status(200).json({code,message,questions})
    }
    function reads(i,files,questions,cb){
        var filePath = 'questions/' + files[i]
        if( i < files.length ){
            fs.readFile( filePath, function (err, data) {
                if(err){
                    send('error','获取数据失败')
                } else {
                    questions.push( JSON.parse(data) )
                }
                reads(++i, files, questions, cb)
            })
        } else {
            cb()
        }
    }
    //判断文件夹是否存在
    fs.exists('questions', function (ex) {
        if(!ex){
            send('error','文件系统错误')
        } else {
            //    读取文件夹内部的所有文件的内容
            fs.readdir('questions', function (err, files) {
                if(err){
                    send('error','文件系统错误')
                } else {
                    console.log(files)
                    //for( var i = 0; i < files.length; i++ ){
                    //    var filePath = 'questions/' + files[i]
                    //    fs.readFile( filePath, function (err, data) {
                    //        console.log( JSON.parse(data))
                    //    })
                    //}
                    var files = files
                    console.log(files)
                    var questions = [ ]
                    reads(0,files,questions, function () {
                        send('success','获取数据成功',questions)
                    })
                }
            })
        }
    })
})

//回答数据处理
app.post('/saveAnswer', function (req, res) {
//    回答的内容保存在哪----问题的文件内，如何与回答的那个问题联系起来？
//    获取文件名称--通过浏览器端设定的cookie
    var aname = req.cookies.username
    var fileName ='questions/' + req.cookies.questions + '.txt'
    req.body.ip = req.ip
    req.body.time = new Date()
    req.body.username = aname
    function send(code,message){
        res.status(200).json({code,message})
    }
    //fs.appendFile(fileName,',' + JSON.stringify(req.body), function (error) {
    //    if(error){
    //        res.send('保存失败')
    //    } else {
    //        res.send('保存成功')
    //    }
    //})
    fs.readFile(fileName, function (err, data) {
        if(err){
            send('error','保存失败')
        } else {
            var datas = JSON.parse(data)
            //datas : {}
            console.log(datas)
            if( !datas.answers ){
                datas.answers = []
            }
            datas.answers.push(req.body)
            fs.writeFile(fileName,JSON.stringify(datas), function (err) {
                if(err){
                    send('fail','保存数据失败')
                } else {
                    send('success','回答提交成功')
                }
            })
        }
    })
})
//首页获取回答的内容信息
app.get('/answers', function (req, res) {
    function send(code,message,answers){
        //code:读取是否成功，message:是否成功相对应的信息，questions:读到的文件的内容数据
        res.status(200).json({code,message,answers})
    }
    function reads(i,files,answers,cb){
        var filePath = 'questions/' + files[i]
        if( i < files.length ){
            fs.readFile( filePath, function (err, data) {
                if(err){
                    send('error','获取数据失败')
                } else {
                    answers.push( JSON.parse(data) )
                }
                reads(++i, files, questions, cb)
            })
        } else {
            cb()
        }
    }
    //判断文件夹是否存在
    fs.exists('questions', function (ex) {
        if(!ex){
            send('error','文件系统错误')
        } else {
            //    读取文件夹内部的所有文件的内容
            fs.readdir('questions', function (err, files) {
                if(err){
                    send('error','文件系统错误')
                } else {
                    console.log(files)
                    //for( var i = 0; i < files.length; i++ ){
                    //    var filePath = 'questions/' + files[i]
                    //    fs.readFile( filePath, function (err, data) {
                    //        console.log( JSON.parse(data))
                    //    })
                    //}
                    var files = files
                    console.log(files)
                    var questions = [ ]
                    reads(0,files,questions, function () {
                        send('success','获取数据成功',questions)
                    })
                }
            })
        }
    })
})
app.listen(4000,function(){
    console.log('Hello everyone!')
});