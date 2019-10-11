//index.js

// 设备身份三元组+区域
const deviceConfig = {
  productKey: "替换",
  deviceName: "替换",
  deviceSecret: "替换",
  regionId: "cn-shanghai"
};

function getPostData() {
  const payloadJson = {
    id: Date.now(),
    params: {
      temperature: Math.floor((Math.random() * 20) + 10),
      humidity: Math.floor((Math.random() * 20) + 60)
    },
    method: "thing.event.property.post"
  }
  return JSON.stringify(payloadJson);
}

function getAlarmPostData() {
  const payloadJson = {
    id: Date.now(),
    params: {
      temperature: Math.floor((Math.random() * 20) + 10)
    },
    method: "thing.event.hotAlarm.post"
  }
  return JSON.stringify(payloadJson);
}

const util = require('../../utils/util.js')
var mqtt = require('../../utils/mqtt.min.js')
const crypto = require('../../utils/hex_hmac_sha1.js')
var client
Page({
  data: {
    temperature: '0',
    humidity: '0',
    imageUrl: '../images/iLED1.png',
    deviceLog: '',
    deviceState: ''
  },
  // 设备身份三元组输入框事件处理函数
  productKeyInput: function (e) {
    deviceConfig.productKey = e.detail.value
  },
  deviceNameInput: function (e) {
    deviceConfig.deviceName = e.detail.value
  },
  deviceSecretInput: function (e) {
    deviceConfig.deviceSecret = e.detail.value
  },

  // 设备上线 按钮点击事件
  online: function (e) {
    this.doConnect()
  },
  doConnect() {
    var that = this;
    const options = this.initMqttOptions(deviceConfig);
    console.log(options)
    client = mqtt.connect('wxs://productKey.iot-as-mqtt.cn-shanghai.aliyuncs.com', options)
    client.on('connect', function () {
      console.log('连接服务器成功')
      let dateTime = util.formatTime(new Date());
      that.setData({
        deviceState: dateTime + ' Connect Success!'
      })
    })
  },
  //IoT平台mqtt连接参数初始化
  initMqttOptions(deviceConfig) {
    const params = {
      productKey: deviceConfig.productKey,
      deviceName: deviceConfig.deviceName,
      timestamp: Date.now(),
      clientId: Math.random().toString(36).substr(2),
    }
    //CONNECT参数
    const options = {
      keepalive: 60, //60s
      clean: true, //cleanSession不保持持久会话
      protocolVersion: 4 //MQTT v3.1.1
    }
    //1.生成clientId，username，password
    options.password = this.signHmacSha1(params, deviceConfig.deviceSecret);
    options.clientId = `${params.clientId}|securemode=2,signmethod=hmacsha1,timestamp=${params.timestamp}|`;
    options.username = `${params.deviceName}&${params.productKey}`;

    return options;
  },
  /*
    生成基于HmacSha1的password
    参考文档：https://help.aliyun.com/document_detail/73742.html?#h2-url-1
  */
  signHmacSha1(params, deviceSecret) {
    let keys = Object.keys(params).sort();
    // 按字典序排序
    keys = keys.sort();
    const list = [];
    keys.map((key) => {
      list.push(`${key}${params[key]}`);
    });
    const contentStr = list.join('');
    return crypto.hex_hmac_sha1(deviceSecret, contentStr);
  },

  // 上报数据 按钮点击事件
  publish: function (e) {
    var that = this;
    let topic = `/sys/${deviceConfig.productKey}/${deviceConfig.deviceName}/thing/event/property/post`;
    // 注意用`符号，不是' ！！！！！
    let JSONdata = getPostData()
    console.log("===postData\n topic=" + topic)
    console.log("payload=" + JSONdata)
    client.publish(topic, JSONdata)
    that.setData({
      deviceLog: 'topic=' + topic + '\n' + 'payload=' + JSONdata
    })
  },

  // 告警 按钮点击事件
  event: function (e) {
    var that = this;
    let topic_alarm = `/sys/${deviceConfig.productKey}/${deviceConfig.deviceName}/thing/event/hotAlarm/post`;
    let JSONdata = getAlarmPostData()
    console.log("===postData\n topic=" + topic_alarm)
    console.log("payload=" + JSONdata)
    client.publish(topic_alarm, JSONdata)
    that.setData({
      deviceLog: 'topic=' + topic_alarm + '\n' + 'payload=' + JSONdata
    })
  },

  // 订阅主题 按钮点击事件
  service: function (e) {
    var that = this;
    that.setData({
      deviceLog: '接收消息监听'
    })
    //接收消息监听
    let topic = `/sys/${deviceConfig.productKey}/${deviceConfig.deviceName}/thing/event/property/post`;
    client.on('message', function (topic, message) {
      // message is Buffer
      let messageStr = message.toString()
      console.log('收到消息：' + messageStr)
      that.setData({
        deviceLog: '收到消息：\n' + messageStr
      })

      if (messageStr.indexOf('on') > 0) {
        that.setData({
          imageUrl: '../images/iLED2.png',
        }) 
      } 
      if (messageStr.indexOf('off') > 0) {
        that.setData({
          imageUrl: '../images/iLED1.png',
        }) 
      }
      if (messageStr.indexOf('blue') > 0) {
        that.setData({
          imageUrl: '../images/iLED3.png',
        })
      }
      if (messageStr.indexOf('green') > 0) {
        that.setData({
          imageUrl: '../images/iLED4.png',
        })
      }
    })
  },

  // 设备下线 按钮点击事件
  offline: function () {
    var that = this;
    client.end()  // 关闭连接
    console.log('服务器连接断开')
    let dateTime = util.formatTime(new Date());
    that.setData({
      deviceState: dateTime + ' Disconnect!'
    })
  },

  onLoad: function () {
    var that = this
    setInterval(function () {
      that.setData({
        temperature: Math.floor((Math.random() * 20) + 10),
        humidity: Math.floor((Math.random() * 20) + 60)
      })
    }, 3000)
  },


  
})
