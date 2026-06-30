# 电影推荐与票务系统 - 功能增强设计

## 目标
在现有代码基础上，补全核心功能，提升演示效果。

## P0 - 核心流程补全

### 1. 修复影片详情页评价
- 后端: `/api/reviews/movie/:movieId` 已存在
- 前端: 从API获取真实评价数据，替换hardcoded mock
- 支持发表评价（评分+短评）

### 2. 15分钟支付倒计时
- 前端: 订单确认弹窗中添加倒计时显示
- 超时自动取消订单（前端提示+后端定时清理）

### 3. 结算时使用优惠券/积分
- 后端: 新增 `/api/orders/:id/apply-coupon` 和 `/api/orders/:id/apply-points`
- 前端: 订单确认弹窗中添加优惠券选择和积分抵扣

### 4. 搜索功能
- 后端: 已有搜索支持（`/api/movies?search=xxx`）
- 前端: 导航栏添加搜索框

## 个性化推荐

### 首页推荐
- 后端: `/api/recommend/home` 已存在（基于用户历史 genre 匹配）
- 前端: 已登录用户显示"猜你喜欢"板块

### 相似影片
- 后端: `/api/recommend/similar/:movieId` 已存在
- 前端: 影片详情页底部显示"相似影片"

## 后台数据看板图表

- 引入 Chart.js（CDN）
- 用户增长曲线（折线图）
- 票房统计（柱状图）
- 影片类型分布（饼图）

## 技术选型
- 前端: Vanilla JS SPA（保持现有架构）
- 图表: Chart.js 4.x via CDN
- 后端: Node.js + Express + SQLite（保持现有）
