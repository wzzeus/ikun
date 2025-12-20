/**
 * 码神挑战 - 42关谜题数据
 * 每关包含：id, title, content, answers (数组，支持多个正确答案)
 */

export const PUZZLE_LEVELS = [
  {
    id: 1,
    title: '最熟悉，也最陌生',
    content: '72 101 108 108 111\n87 111 114 108 100',
    answers: ['HelloWorld', 'Hello World', 'helloworld', 'hello world'],
    hint: 'ASCII 码表是程序员的老朋友',
    explanation: 'ASCII 码是美国制定的信息交换标准代码，是一种现今通用的标准单字节字符编码方案，是基于拉丁字母表的一套电脑编码系统。这道题中的数字分别对应字母：72=H, 101=e, 108=l, 108=l, 111=o, 87=W, 111=o, 114=r, 108=l, 100=d，组合起来就是 "Hello World"——每个程序员的第一行代码！',
  },
  {
    id: 2,
    title: '机器的母语',
    content: '01001000 01101001',
    answers: ['Hi', 'hi', 'HI'],
    hint: '每 8 位二进制 = 1 个字符',
    explanation: '二进制是计算机最底层的语言，所有数据最终都会转换成 0 和 1。01001000 = 72 = \'H\'，01101001 = 105 = \'i\'。从十进制 ASCII 到二进制 ASCII，你已经更接近机器的思维了！',
  },
  {
    id: 3,
    title: '兔子的秘密',
    content: '1, 1, 2, 3, 5, 8, 13, ?',
    answers: ['21'],
    hint: '前两个数相加等于...',
    explanation: '这是著名的斐波那契数列——每个数等于前两个数之和（13 + 8 = 21）。这个数列源自意大利数学家斐波那契提出的兔子繁殖问题，是递归算法的经典入门案例，也神奇地藏在向日葵花盘、鹦鹉螺壳等大自然的螺旋中。',
  },
  {
    id: 4,
    title: '调色板的暗号',
    content: '#FF0000',
    answers: ['红', '红色', 'red', 'RED', 'Red'],
    hint: 'RGB 三原色，FF = 255',
    explanation: '这是 CSS 中的十六进制颜色码，格式为 #RRGGBB。FF = 255（红色通道满值），00 = 0（绿色通道为零），00 = 0（蓝色通道为零）。RGB 三原色中只有红色拉满，所以显示为纯红色！前端开发者的必备知识。',
  },
  {
    id: 5,
    title: '世界上最远的距离',
    content: '程序员眼中\n1 + 1 = ?',
    answers: ['10', '二', '2'],
    hint: '二进制世界，逢二进一',
    explanation: '在二进制中，1 + 1 = 10（逢二进一）。这也是为什么程序员常说"世界上有 10 种人，懂二进制的和不懂的"——这里的 10 其实是二进制的 2！当然，十进制答案 2 也对。',
  },
  {
    id: 6,
    title: '网址的面具',
    content: '%48%65%6C%6C%6F',
    answers: ['Hello', 'hello', 'HELLO'],
    hint: '百分号后面是十六进制 ASCII',
    explanation: 'URL 编码（又称百分号编码）用于在网址中传递特殊字符。%48=H, %65=e, %6C=l, %6C=l, %6F=o。当你在浏览器地址栏看到 %20 时，其实就是空格！中文在 URL 中也会被编码成一长串 %XX。',
  },
  {
    id: 7,
    title: '服务器的表情包',
    content: '😊 = 200\n😖 = 500\n🤷 = ?',
    answers: ['404'],
    hint: '当页面找不到时...',
    explanation: 'HTTP 状态码是服务器的"表情包"。200 OK 表示一切正常（开心），500 Internal Server Error 表示服务器崩了（痛苦），404 Not Found 表示资源不存在（耸肩）。还有 403 禁止访问、301 永久重定向、502 网关错误等。',
  },
  {
    id: 8,
    title: '网络的门牌号',
    content: 'HTTP → 80\nSSH → 22\nHTTPS → ?',
    answers: ['443'],
    hint: '加了 S 的更安全',
    explanation: '端口号就像网络世界的门牌号，不同服务住在不同的"房间"。HTTP 默认 80，HTTPS 默认 443，SSH 默认 22，MySQL 默认 3306，Redis 默认 6379。面试常考题！',
  },
  {
    id: 9,
    title: '邮件的暗语',
    content: 'Q29kZQ==',
    answers: ['Code', 'code', 'CODE'],
    hint: '结尾的 == 是它的招牌',
    explanation: 'Base64 是一种将二进制数据编码为可打印字符的方法。你可能在 JWT Token、邮件附件、或者 <img src="data:image/png;base64,..."> 中见过它。等号是填充符，用于补齐长度。在浏览器控制台输入 atob("Q29kZQ==") 即可解码！',
  },
  {
    id: 10,
    title: '卡住的按钮',
    contentType: 'stuck-btn',
    content: '按钮似乎被什么挡住了...',
    answers: ['CLICK_ME', 'click_me'],
    hint: '表面上看不出问题',
    explanation: '按钮上方有一个透明的遮罩层阻挡了点击。用 F12 找到遮罩元素，删除它或设置 pointer-events: none，就能点击按钮看到答案！',
  },
  {
    id: 11,
    title: '99%',
    contentType: 'progress-bar',
    content: '加载永远停在这里...',
    answers: ['COMPLETE', 'complete', '100'],
    hint: '差一点就完成了',
    explanation: '进度条被 CSS 限制在 99%。修改进度条的 width 样式为 100%，或者修改 data-progress 属性为 100，就会触发完成事件显示答案！',
  },
  {
    id: 12,
    title: '沉睡的计时器',
    contentType: 'frozen-timer',
    content: '时间停止了',
    answers: ['AWAKEN', 'awaken'],
    hint: '也许有什么能唤醒它',
    explanation: '页面上有一个暂停的计时器。在控制台执行 window.startTimer() 可以启动它，倒计时结束后会显示答案 AWAKEN！',
  },
  {
    id: 13,
    title: '折叠的秘密',
    contentType: 'collapsed',
    content: '这里只有一行字',
    collapsedAnswer: 'UNFOLD_ME',
    answers: ['UNFOLD_ME', 'unfold_me'],
    hint: '真的只有这么点内容吗',
    explanation: '内容区域被 CSS 设置了 max-height: 20px 和 overflow: hidden，下方还有隐藏的文字。修改样式展开区域就能看到答案！',
  },
  {
    id: 14,
    title: '迷路的图片',
    contentType: 'broken-img',
    content: '图片去哪了？',
    answers: ['小黑子', 'ikun', 'IKUN', 'iKun', '黑子', '坤坤', 'kun', 'KUN'],
    hint: '它只是找不到路',
    explanation: '图片的 src 路径是错误的。在 Network 面板可以看到 404 错误。修改 img 元素的 src 为正确路径（提示在 data-correct-src 属性里），图片加载后会显示答案！',
  },
  {
    id: 15,
    title: '失声的按钮',
    contentType: 'silent-btn',
    content: '点击没有任何反应',
    answers: ['VOICE_ON', 'voice_on'],
    hint: '事件被谁吞掉了',
    explanation: '按钮的点击事件被一个外层元素用 event.stopPropagation() 阻止了。找到那个元素并移除监听器，或者直接在控制台调用 document.querySelector(\'#secret-btn\').dataset.answer 获取答案！',
  },
  {
    id: 16,
    title: '影子文字',
    contentType: 'shadow-text',
    content: '页面上什么都没有',
    answers: ['SHADOW_KEY', 'shadow_key'],
    hint: '不是所有内容都在 HTML 里',
    explanation: '答案藏在 CSS 伪元素的 content 属性里。用开发者工具检查元素，在 Styles 面板查看 ::after 或 ::before 伪元素，就能找到答案！',
  },
  {
    id: 17,
    title: '颠倒的世界',
    contentType: 'flipped',
    content: 'TERCES_EDOC',
    answers: ['CODE_SECRET', 'code_secret'],
    hint: '镜子里的文字',
    explanation: '文字被 CSS transform: scaleX(-1) 水平翻转了。在脑中或纸上把字母顺序反过来，TERCES_EDOC → CODE_SECRET！',
  },
  {
    id: 18,
    title: '无障碍通道',
    contentType: 'aria-hidden',
    content: '「  」',
    ariaAnswer: 'ACCESSIBLE',
    answers: ['ACCESSIBLE', 'accessible'],
    hint: '屏幕阅读器能看到什么',
    explanation: '视觉上显示为空，但答案藏在元素的 aria-label 属性中。这是网页无障碍设计的重要知识，用于给辅助技术提供信息！',
  },
  {
    id: 19,
    title: '被拦截的请求',
    contentType: 'blocked-request',
    content: '数据一直在加载中...',
    answers: ['REQUEST_OK', 'request_ok'],
    hint: '请求好像缺了什么',
    explanation: '页面发起的请求被阻止了，需要添加正确的请求头。在 Network 面板查看失败的请求，然后在控制台用 fetch 发送带正确参数的请求获取答案！',
  },
  {
    id: 20,
    title: '循环的真相',
    contentType: 'animation-debug',
    content: '动画太快了，看不清...',
    answers: ['PAUSE_IT', 'pause_it'],
    hint: '让它停下来',
    explanation: '答案在一个快速循环的动画中一闪而过。可以用开发者工具暂停 JavaScript 执行，或者在 Elements 面板找到动画元素，查看其在某一帧的内容，就能捕捉到答案！',
  },
  {
    id: 21,
    title: '鸡哥最爱的颜色',
    content: '',
    contentType: 'color',
    colorValue: '#FFD700',
    answers: ['#FFD700', 'FFD700', '#ffd700', 'ffd700', '#FFFF00', 'FFFF00', '#ffff00', 'ffff00', '#FFD800', 'FFD800', '#ffd800', 'ffd800', '黄色', '黄', 'yellow', 'YELLOW', 'gold', 'GOLD', '金色', '金黄色'],
    hint: '十六进制颜色码',
    explanation: '这是金黄色 #FFD700，也叫 Gold。鸡哥（ikun）的应援色就是黄色！在 CSS 中，十六进制颜色码以 # 开头，后面跟 6 位十六进制数，分别代表 RGB 三个通道的值。',
  },
  {
    id: 22,
    title: '这个 URL 好奇怪',
    content: '',
    contentType: 'url',
    urlParam: 'answer=ikuncode',
    answers: ['ikuncode', 'IKUNCODE', 'IkunCode'],
    hint: '地址栏',
    explanation: 'URL 参数（Query String）是网址中 ? 后面的部分，格式为 key=value。这是前后端传递数据的常用方式。在 JavaScript 中可以用 new URLSearchParams(window.location.search) 来解析。',
  },
  {
    id: 23,
    title: '网站内没有本关提示，绝对没有！',
    content: '',
    contentType: 'title',
    titleHint: '码神挑战 | 答案是 chicken',
    answers: ['chicken', 'CHICKEN', 'Chicken'],
    hint: '真的没有吗？',
    explanation: '浏览器标签页显示的是 document.title 的内容。开发者可以用 JavaScript 动态修改它，比如显示未读消息数、加载状态等。这也是一种隐藏彩蛋的方式！',
  },
  {
    id: 24,
    title: '这里真的什么都没有',
    content: '',
    contentType: 'hidden',
    hiddenText: 'secret2024',
    answers: ['secret2024', 'SECRET2024'],
    hint: '真的吗？',
    explanation: '网页中可以用 CSS 隐藏文字，比如设置颜色和背景色相同、字体大小为0、visibility:hidden 等。但这些"隐藏"的内容在 HTML 源码中仍然存在，用开发者工具可以轻松找到！',
  },
  {
    id: 25,
    title: '神秘代码',
    content: '请破译这串神秘代码',
    contentType: 'timestamp',
    timestamp: 1766629511, // 2025-12-25 10:25:11 (圣诞节，星期四)
    answers: ['V50', 'v50', 'V我50', 'v我50', '疯狂星期四', 'KFC疯狂星期四'],
    hint: '这个数字有什么特别的含义？',
    explanation: '1766629511 是 Unix 时间戳，转换后是 2025-12-25 10:25:11，是圣诞节，同时也是星期四！KFC 疯狂星期四的经典梗就是"V我50"，源自网络上各种疯狂星期四文案最后都会来一句"V我50吃KFC"。',
  },
  {
    id: 26,
    title: '分量',
    content: '可惜你不是程序员，也不懂这张图的 "分量"',
    contentType: 'image',
    imageSrc: '/src/data/image/xiaoheizi-D7tntIe0.jpeg',
    imageAlt: '有趣的梗图',
    answers: ['9128', '9128字节', '9128bytes', '9128B'],
    hint: '分量...重量...大小？',
    explanation: '这道题的关键词是"分量"，暗示的是图片的文件大小。通过下载图片或在 DevTools 的 Network 面板查看，可以发现这张图片的大小正好是 9128 字节。程序员经常需要关注文件大小来优化网站性能！',
  },
  {
    id: 27,
    title: '看不见的秘密',
    content: '答案就在下面，你能看到吗？',
    contentType: 'password',
    passwordValue: '52ikuncode',
    answers: ['52ikuncode', '52IKUNCODE', '52IkunCode'],
    hint: '这个输入框有点奇怪...',
    explanation: '这是一个 type="password" 的输入框，内容会被显示为圆点。使用 F12 开发者工具，在 Elements 面板中找到这个 input 元素，将 type="password" 改成 type="text"，就能看到隐藏的答案 "52ikuncode" 了！',
  },
  {
    id: 28,
    title: '看图识字',
    content: '小学题，这是什么？',
    contentType: 'cookie',
    imageSrc: '/src/data/image/cookie.png',
    cookieAnswer: 'ilovecoding',
    answers: ['ilovecoding', 'ILOVECODING', 'ILoveCoding', 'i love coding'],
    hint: '图片里是什么？程序员在哪里存它？',
    explanation: '图片是一块曲奇饼干（Cookie），而 Cookie 在编程中是浏览器存储数据的一种方式。打开 F12 → Application → Cookies，就能找到隐藏的答案 "ilovecoding"！这是前端开发者必须了解的浏览器存储机制。',
  },
  {
    id: 29,
    title: 'Debug',
    content: 'Debug',
    contentType: 'console',
    consoleMessage: '7146',
    answers: ['7146'],
    hint: '程序员调试的时候会看哪里？',
    explanation: '标题 "Debug" 暗示调试。程序员调试时最常看的就是浏览器控制台（Console）。打开 F12 → Console，会看到一条错误日志，仔细看错误码就是答案！',
  },
  {
    id: 30,
    title: '看不见的差异',
    content: 'a === \x001\nb === 1\n\na 和 b 有什么区别?',
    contentType: 'console',
    consoleMessage: 'ab_hint',
    consoleCustom: true,
    answers: ['\\x00', '\\x001', '0x00', 'null', 'NUL', '空字符'],
    hint: '控制台里看看 a 和 b',
    explanation: 'a 的值是 "\\x001"，其中 \\x00 是十六进制转义字符，表示 ASCII 码为 0 的空字符（NUL）。虽然显示上看起来像数字 1，但实际上前面有一个不可见的空字符。这种"看不见"的字符在安全领域常被用于绕过检测！',
  },
  {
    id: 31,
    title: '神秘文件',
    content: '这有一个文件，快下载来看看',
    contentType: 'download',
    downloadUrl: '/src/data/image/mystery_file.txt',
    downloadName: 'mystery_file.txt',
    answers: ['ctrl', 'CTRL', 'Ctrl'],
    hint: '这个文件真的是 txt 吗？',
    explanation: '下载文件后用文本编辑器打开，虽然显示乱码，但开头能看到 "PNG" 字样——这是 PNG 图片的文件头标识（魔数）。将文件后缀从 .txt 改成 .png，就能看到图片里的答案 "ctrl"！文件头/魔数是识别真实文件类型的关键知识。',
  },
  {
    id: 32,
    title: '本地记忆',
    content: '有些东西，浏览器会帮你记住',
    contentType: 'localStorage',
    localStorageKey: 'secret_memory',
    localStorageValue: 'remember_me_2025',
    answers: ['remember_me_2025', 'REMEMBER_ME_2025'],
    hint: '浏览器能存储什么？',
    explanation: '浏览器的 localStorage 是一种本地存储机制，可以持久化保存数据。打开 F12 → Application → Local Storage，就能看到存储的数据。这是前端开发中常用的数据持久化方案！',
  },
  {
    id: 33,
    title: '属性的秘密',
    content: '这段文字里藏着秘密',
    contentType: 'dataAttr',
    dataAttrValue: 'data_is_power',
    answers: ['data_is_power', 'DATA_IS_POWER'],
    hint: 'HTML 元素可以有很多属性...',
    explanation: 'HTML5 的 data-* 自定义属性可以在元素上存储额外数据。通过 F12 检查元素，可以在 Elements 面板看到 data-secret 属性，里面就是答案！这在前端开发中常用于传递数据给 JavaScript。',
  },
  {
    id: 34,
    title: '篱笆上的秘密',
    content: `密文：IC2KNOE05UD2

提示：文字在篱笆上走了个"之"字形
栏数：3`,
    answers: ['IKUNCODE2025', 'ikuncode2025'],
    hint: '栅栏密码，3层篱笆',
    explanation: '这是栅栏密码（Rail Fence Cipher），一种古老的置换密码。加密时文字按之字形排列在多行"栅栏"上，然后按行读取。解密需要逆向操作：先计算每行字符数，再按之字形填回。这道题 3 栏 12 字符，排列后得到 IKUNCODE2025！',
  },
  {
    id: 35,
    title: '你太美',
    content: `鸡 === \\u9e21  你 === \\u4f60  太 === \\u592a  美 === ?

好像是某种神秘编码`,
    answers: ['\\u7f8e', '\\U7F8E', '7f8e', '7F8E', 'u7f8e', 'U7F8E'],
    hint: '每个汉字都有自己的 Unicode 编码',
    explanation: 'Unicode 是全球通用的字符编码标准，每个字符都有唯一的编码。"美"的 Unicode 编码是 U+7F8E。在 JavaScript 中可以用 "美".charCodeAt(0).toString(16) 获取，或者直接搜索"美 Unicode"。这是国际化开发的基础知识！',
  },
  {
    id: 36,
    title: '服务器的回响',
    content: '点击按钮，但什么也没发生？',
    contentType: 'fetch',
    fetchUrl: '/api/v1/puzzle/answer',
    answers: ['ikun_nb_666', 'IKUN_NB_666'],
    hint: '真的什么都没发生吗？',
    explanation: '点击按钮后看似没有反应，但实际上浏览器已经向服务器发送了请求。打开 F12 → Network 面板，就能看到请求和响应。答案就藏在服务器返回的 JSON 数据中！',
  },
  {
    id: 37,
    title: '探索3735928559',
    content: `3735928559`,
    answers: ['DEADBEEF', 'deadbeef', '0xDEADBEEF', '0xdeadbeef', 'dead beef'],
    hint: '这个数字有点"死牛肉"的味道',
    explanation: '3735928559 转成十六进制是 0xDEADBEEF，这是程序员圈子里最著名的魔数之一！它常被用作内存调试标记、未初始化内存填充等。类似的还有 0xCAFEBABE（Java class文件头）、0xBAADF00D（坏食物）等。',
  },
  {
    id: 38,
    title: '已知',
    content: `coder_ikun + mysecretis123456 => ArocnwrBmX0VUA==

? + mysecretis654321 => GLoNpR/xn3I=`,
    answers: ['you_good', 'YOU_GOOD', 'You_Good'],
    hint: '这是一种流行的对称流加密算法',
    explanation: 'RC4 是一种对称流加密算法，加密和解密使用相同的密钥。通过分析第一组数据可以识别出这是 RC4 加密后进行 Base64 编码。使用在线 RC4 解密工具或编写代码，用密钥 mysecretis654321 解密 ntPc4wO4v/Y= 即可得到明文 you_good！',
  },
  {
    id: 39,
    title: '看不见的真相',
    contentType: 'svg-puzzle',
    content: `<div style="position: relative; width: 200px; height: 80px; overflow: hidden;">
  <svg width="200" height="200" style="position: absolute; top: 0; left: 0;">
    <text x="100" y="50" text-anchor="middle" fill="#00ff00" font-size="36" font-family="monospace">CTRL</text>
    <text x="100" y="150" text-anchor="middle" fill="#00ff00" font-size="36" font-family="monospace">+V</text>
  </svg>
</div>`,
    answers: ['CTRL+V', 'ctrl+v', 'Ctrl+V', 'CTRL + V', 'ctrl + v'],
    hint: '容器装不下所有内容',
    explanation: '外层 div 设置了 overflow: hidden 和固定高度 80px，但内部 SVG 高度为 200px。通过 F12 修改外层 div 的 height 或移除 overflow: hidden，就能看到被隐藏的 "+V"，完整答案是 CTRL+V！',
  },
  {
    id: 40,
    title: '404',
    content: `404`,
    answers: ['easter_egg_404', 'EASTER_EGG_404'],
    hint: '访问一个不存在的页面',
    explanation: '404 是 HTTP 状态码，表示页面未找到。访问站内任意不存在的路径（如 /asdf），在 404 页面的元素中隐藏着答案 easter_egg_404！',
  },
  {
    id: 41,
    title: '时间旅行者',
    contentType: 'time-travel',
    content: `function unlock(year) {
  if (new Date().getFullYear() === year) {
    return "flag_" + year;
  }
  return "时间不对...";
}

// 调用 unlock(2025) 获取答案`,
    answers: ['flag_2025', 'FLAG_2025'],
    hint: '你能改变"现在"吗？',
    explanation: '这道题需要你在浏览器控制台重写 Date 对象！在 Console 中执行：Date = class { getFullYear() { return 2025 } }; 然后再调用 unlock(2025) 即可得到 flag_2025。这考察了 JavaScript 中对象可被覆盖的特性！',
  },
  {
    id: 42,
    title: '终极挑战',
    contentType: 'code',
    content: `// 恭喜你来到最后一关！
//
// POST /api/v1/puzzle/final
// Content-Type: application/json
// Body: { "code": "IKUN2025" }
//
// 用你学到的知识，手动调用这个接口吧！`,
    answers: ['ikuncode团队提前祝大家2026年元旦快乐，顺风顺水顺财神', 'ikuncode团队提前祝大家2026年元旦快乐,顺风顺水顺财神'],
    hint: '用 fetch 或 curl 调用接口',
    explanation: '这道终极题需要你手动发送 POST 请求！可以在控制台执行：fetch("/api/v1/puzzle/final", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({code:"IKUN2025"})}).then(r=>r.json()).then(console.log)，或者用 curl/Postman 调用接口获取答案！',
  },
]

/**
 * 答案验证函数
 * @param {number} levelId - 关卡ID
 * @param {string} userAnswer - 用户答案
 * @returns {boolean} - 是否正确
 */
export const validateAnswer = (levelId, userAnswer) => {
  const level = PUZZLE_LEVELS.find(l => l.id === levelId)
  if (!level) return false

  const normalizedUserAnswer = userAnswer.trim()
  return level.answers.some(answer =>
    answer.toLowerCase() === normalizedUserAnswer.toLowerCase()
  )
}

/**
 * 获取关卡数据
 * @param {number} levelId - 关卡ID
 * @returns {object|null} - 关卡数据
 */
export const getLevel = (levelId) => {
  return PUZZLE_LEVELS.find(l => l.id === levelId) || null
}

export const TOTAL_LEVELS = 42
