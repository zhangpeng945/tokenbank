# TokenBank — LLM API Token 共享与银行平台

一个公开 SaaS 平台，核心是 **LLM API 代理 + Token 经济系统**。

## 功能概览

- **多 Key 轮询 / 负载均衡**：多个供应商 API Key 池化，加权轮询，自动健康检查与故障切换
- **Token 银行**：存款、取款、透支（信用额度）、转账（P2P）、每日利息结算
- **用户配额管理**：日 / 月 token 限额，超额拦截
- **用量统计与计费**：按模型定价，实时 token 计数，调用明细报表

## 快速开始

### Docker 一键启动

```bash
cp backend/.env.example backend/.env
# 编辑 .env，填入 ENCRYPTION_KEY 和 JWT_SECRET_KEY
make up
```

启动后访问：
- 前端：http://localhost:3000
- 后端 API：http://localhost:8000/docs
- 默认管理员：admin@tokenbank.app / admin123（首次启动自动创建）

### 本地开发（不用 Docker）

```bash
# 1. 启动 PostgreSQL 和 Redis
docker compose up -d postgres redis

# 2. 安装依赖
make install

# 3. 运行数据库迁移
make migrate

# 4. 分别启动前后端
make backend   # http://localhost:8000
make frontend  # http://localhost:3000
```

## 接入方式

用户注册后在平台创建 API Key，然后像使用 OpenAI 一样调用：

```python
from openai import OpenAI

client = OpenAI(
    api_key="tbk-xxxxxxxxxxxx",
    base_url="http://localhost:8000/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "你好"}]
)
print(response.choices[0].message.content)
```

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Python 3.12 + FastAPI + SQLAlchemy 2.0 (async) |
| 前端 | React + Vite + TypeScript + TailwindCSS |
| 数据库 | PostgreSQL 16 |
| 缓存 | Redis 7 |
| 部署 | Docker Compose |

## 项目结构

```
tokenbank/
├── backend/          # FastAPI 后端
│   ├── app/
│   │   ├── models/       # ORM 模型
│   │   ├── schemas/       # Pydantic 模型
│   │   ├── api/           # 路由
│   │   ├── services/      # 业务逻辑
│   │   ├── middleware/     # 认证、限流
│   │   └── tasks/         # 定时任务
│   ├── alembic/       # 数据库迁移
│   └── requirements.txt
├── frontend/         # React 前端
│   └── src/
│       ├── pages/     # 页面组件
│       ├── components/ # 通用组件
│       └── api/       # API 客户端
├── docker-compose.yml
├── Makefile
└── README.md
```

## License

MIT
