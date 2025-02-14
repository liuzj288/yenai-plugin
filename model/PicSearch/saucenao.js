import lodash from 'lodash'
import fetch from 'node-fetch'
import { Config } from '../../components/index.js'
import sagiri from '../../tools/sagiri.js'
import { common } from '../index.js'

export default async function doSearch (url) {
  let res = await getSearchResult(url)
  if (res.error) return res.error
  console.log(res)
  if (res.header.status != 0) return { error: 'SauceNAO搜图，错误信息：' + res.header.message.replace(/<.*?>/g, '') }
  let format = sagiri(res)
  if (lodash.isEmpty(format)) return { error: 'SauceNAO搜图无数据' }

  let msgMap = async item => [
      `SauceNAO (${item.similarity}%)\n`,
      await common.proxyRequestImg(item.thumbnail),
      `\nSite：${item.site}\n`,
      `作者：${item.authorName}(${item.authorUrl})\n`,
      `来源：${item.url.toString()}`
  ]
  let maxSimilarity = format[0].similarity
  if (maxSimilarity < Config.picSearch.SauceNAOMinSim) {
    return { error: `SauceNAO 相似度 ${maxSimilarity}% 过低` }
  }
  let filterSimilarity = format.filter(item => item.similarity > 80)
  let message = []
  if (!lodash.isEmpty(filterSimilarity)) {
    let filterPixiv = filterSimilarity.filter(item => item.site == 'Pixiv')
    if (!lodash.isEmpty(filterPixiv)) {
      message.push(await msgMap(filterPixiv[0]))
    } else {
      message.push(await msgMap(filterSimilarity[0]))
    }
  } else {
    message = await Promise.all(format.map(msgMap))
  }
  let n = maxSimilarity > 80 ? '\n' : ''
  if (res.header.long_remaining < 30) {
    message.push(`${n}SauceNAO 24h 内仅剩 ${res.header.long_remaining} 次使用次数`)
  }
  if (res.header.short_remaining < 3) {
    message.push(`${n}SauceNAO 30s 内仅剩 ${res.header.short_remaining} 次。`)
  }
  return message
}

async function getSearchResult (imgURL, db = 999) {
  logger.debug(`saucenao [${imgURL}]}`)
  let api_key = Config.picSearch.SauceNAOApiKey
  if (!api_key) return { error: '未配置SauceNAOApiKey，无法使用SauceNAO搜图，请在 https://saucenao.com/user.php?page=search-api 进行获取，请用指令：#SauceNAOapiKey <apikey> 进行添加' }
  let params = {
    api_key,
    db,
    output_type: 2,
    numres: 3,
    url: imgURL,
    hide: Config.picSearch.hideImgWhenSaucenaoNSFW
  }
  let res = await request('https://saucenao.com/search.php', params)
  if (!res) return { error: 'SauceNAO搜图网络请求失败，注：移动网络无法访问SauceNAO，可尝试配置代理' }
  return res
}

async function request (url, params, headers) {
  const qs = (obj) => {
    let res = ''
    for (const [k, v] of Object.entries(obj)) { res += `${k}=${encodeURIComponent(v)}&` }
    return res.slice(0, res.length - 1)
  }
  let proxy = await common.getAgent()
  return await fetch(url + '?' + qs(params), {
    agent: proxy,
    headers
  }).then(res => res.json()).catch(err => console.log(err))
}
