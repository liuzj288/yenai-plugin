import { PicSearch, common } from '../model/index.js'
import { Config } from '../components/index.js'
import lodash from 'lodash'
export class newPicSearch extends plugin {
  constructor () {
    super({
      name: '椰奶图片搜索',
      event: 'message',
      priority: 2000,
      rule: [
        {
          reg: '^#?(椰奶)?(以图)?搜图.*$',
          fnc: 'search'
        },
        {
          reg: /^#?SauceNAOapiKey.*$/i,
          fnc: 'UploadSauceNAOKey'
        },
        {
          reg: '^#?(Ascii2D|ac)搜图.*$',
          fnc: 'Ascii2D'
        }
      ]
    })
  }

  async search (e) {
    if (e.source) {
      let source
      if (e.isGroup) {
        source = (await e.group.getChatHistory(e.source.seq, 1)).pop()
      } else {
        source = (await e.friend.getChatHistory(e.source.time, 1)).pop()
      }
      e.img = [source.message.find(item => item.type == 'image')?.url]
    }
    if (lodash.isEmpty(e.img)) {
      this.setContext('MonitorImg')
      e.reply('✅ 请发送图片')
      return
    }
    let res = await PicSearch.SauceNAO(e.img[0])
    if (res.error) {
      e.reply(res.error)
      return this.Ascii2D(e)
    }

    res.length == 1 ? common.recallsendMsg(e, res[0], true) : common.getRecallsendMsg(e, res)
  }

  async Ascii2D (e) {
    if (!e.img) return
    let res = await PicSearch.Ascii2D(e.img[0])
    if (res?.error) return e.reply(res.error)
    common.getRecallsendMsg(e, res)
  }

  async MonitorImg () {
    if (!this.e.img) {
      this.e.reply('❎ 未检测到图片操作已取消')
    } else {
      let res = await PicSearch.SauceNAO(this.e.img[0])
      if (res.error) return this.e.reply(res.error)
      res.message.length == 1 ? common.recallsendMsg(this.e, res.message[0], true) : common.getRecallsendMsg(this.e, res.message)
    }
    this.finish('MonitorImg')
  }

  async UploadSauceNAOKey (e) {
    if (!e.isMaster) return false
    if (e.isGroup) return e.reply('请私聊进行添加')
    let apiKey = e.msg.replace(/#?SauceNAOapiKey/i, '').trim()
    if (!apiKey) return e.reply('❎ 请发送正确的apikey')
    Config.modify('picSearch', 'SauceNAOApiKey', apiKey)
    e.reply('OK')
  }
}
