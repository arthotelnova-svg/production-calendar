module.exports = {
  apps: [{
    name: "production-calendar",
    script: "npm",
    args: "start",
    cwd: __dirname,
    env: {
      NODE_ENV: "production",
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: "256M",
  }],
};
