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
app.post('/saveAsk',form.array(), function (req, res) {
    function send(code,message){
        res.status(200).json({code,message})
    }
    console.log(req.body)
    //把数据保存至某个文件夹的文件中
    fs.exists('questions',function(exists){
        if( !exists ){
            send('none','文件夹不存在，请创建文件夹')
            fs.mkdirSync('questions')
        }
        var infos = req.body
        var mess = {
            infos,
            date:new Date(),
            ip:req.ip
        }
        var str = JSON.stringify(mess)
        var date = str.date
        //添加文件内容到某个文件夹中
        fs.appendFile('questions/' + date +  '.txt',str + ',', function (error) {
            if(error){
                send('fail','提问失败')
            } else {
                send('success','提问成功')
            }
        })
    })
})
app.get('/saveAsk',function(req,res){
    fs.exists('questions',function(exists){
        if( exists ){
            fs.readFile('questions/undefined.txt',function(err,data){
                if(data){
                    res.send(data)
                } else {
                    res.send('获取数据失败')
                }
            })
        }
    })
});

app.listen(4000,function(){
    console.log('Hello everyone!')
});