# Bungie 配置指南

这份文档专门解决一件事：怎么创建自己的 Bungie Application，并把里面的字段正确填到 d2-tools 里。

## 1. 为什么必须自己创建

d2-tools 是公开分发的本地工具，不会在发布包里内置任何人的 Bungie `API Key`、`Client ID` 或 `Client Secret`。

所以每个玩家都需要创建自己的 Bungie Application，然后把配置填到本机。

这样做的好处是：

- 你的配置只保存在你自己的电脑上
- 项目分发时不会夹带开发者密钥
- 安全边界更清楚

## 2. 去哪里创建

打开 Bungie 官方开发者页面：

[Bungie Developer Portal](https://www.bungie.net/en/Application)

登录你的 Bungie 账号后创建一个新的 Application。

## 3. 需要填哪些字段

d2-tools 里要填这 3 个值：

- `API Key`
- `Client ID`
- `Client Secret`

它们都来自你刚创建的 Bungie Application 页面。

## 4. 回调地址怎么填

如果你使用 d2-tools 默认本地登录方式，应用的 OAuth 回调地址需要填写为：

```text
https://127.0.0.1:28780/oauth/callback
```

如果你未来改了本地监听端口，回调地址也要跟着改成同一个端口。

## 5. 建议怎么填写 Application

你可以按下面思路填：

- 应用名称：随便，自己看得懂就行，比如 `d2-tools-local`
- 主页地址：可以填 Bungie 自己页面、你的 GitHub 主页，或者一个普通可访问地址
- OAuth 回调地址：`https://127.0.0.1:28780/oauth/callback`

重点是回调地址要正确，其他展示字段不是 d2-tools 的核心依赖。

## 6. d2-tools 里的对应关系

在 d2-tools 设置页中：

- `API Key` 对应 Bungie Application 里的 `API Key`
- `Client ID` 对应 Bungie Application 里的 `Client ID`
- `Client Secret` 对应 Bungie Application 里的 `Client Secret`

不要填错位置，也不要多复制空格。

## 7. 填完后怎么验证

填好之后：

1. 点击“保存配置”
2. d2-tools 会在后台自动准备资料库，请保持程序打开
3. 配置保存后即可点击“登录 Bungie”，不需要等待资料库完成
4. 浏览器跳到 Bungie 授权页
5. 完成授权并等待浏览器回跳
6. 软件进入可读取账号的状态；资料库完成后，装备名称、图标、perk 和活动解析会自动补齐

如果资料库后台准备失败，配置不会丢失，按页面提示重试即可；已登录账号不需要重新授权。若反复失败，再检查网络和 API Key。

## 8. 常见错误

### 8.1 点击登录没反应

先检查：

- `API Key`、`Client ID`、`Client Secret` 是否为空
- 是否真的点了保存配置
- Windows 防火墙或安全软件是否拦截了本地回调

### 8.2 授权后回不来

通常先看这几项：

- 回调地址是否就是 `https://127.0.0.1:28780/oauth/callback`
- d2-tools 是否正在运行
- 本地回调端口是否被别的程序占用

### 8.3 回调页打开了，但软件还是没登录

优先检查：

- 你是否修改过回调端口
- 配置保存后是否重新触发了登录
- 本地 HTTPS 回调是否被系统安全策略拦住

## 9. 安全提醒

- 不要把自己的 `Client Secret` 发到群里
- 不要把包含配置的截图随便公开
- 不要把本机 `%APPDATA%\\d2-tools` 整个目录直接发给别人

如果你担心 AI 或日志会不会碰这些敏感信息，去看 [安全说明](security.md)。

## 10. 还不行怎么办

如果你按这份文档做完还是不行，优先看：

- [常见问题](faq.md)
- [玩家使用指南](user-guide.md)

如果你要反馈问题，最好同时说明：

- 你填的是不是自己的 Bungie Application
- 回调地址填的是什么
- 点击登录后卡在哪一步
