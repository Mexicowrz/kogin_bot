process.env.NTBA_FIX_319 = 1;
const TelegramBot = require("node-telegram-bot-api");
const cluster = require("cluster");
const numCPUs = require("os").cpus().length;

const patternFactory = require("./Pattern");
const Telegram = require("./Telegram");
const Web = require("./Web");
const Channel = require("./Channel");

const { generatePattern, isTrue } = require("./utils");

const DOT = 20;
const GRID_LINE = 1;
const STITCH_LINE = 5;

const [CANVAS_WIDTH, CANVAS_HEIGHT] = [29 * DOT + DOT / 2, 280.5];

const newPattern = patternFactory(
  CANVAS_WIDTH * 2,
  CANVAS_HEIGHT * 2 - DOT,
  DOT,
  STITCH_LINE,
  GRID_LINE
);
// const p = newPattern(generatePattern(false));

// getImage(p.canvas, __dirname + "/test.png");

function startTelegramServices({ token, channel }, router) {
  const bot = new TelegramBot(token, { polling: true });
  new Telegram(bot, router);
  const ch = new Channel(bot, channel, router, 1000 * 60 * 60 * 12);

  return async () => {
    await ch.close();
  };
}

function startWebService({ port }, router) {
  const w = new Web(port, router);
  return async () => {
    await w.close();
  };
}

const config = {
  token: process.env["TOKEN"],
  channel: process.env["CHANNEL"],
  port: process.env["PORT"],
};

const router = {
  symmetric: () => newPattern(generatePattern(true)),
  asymmetric: () => newPattern(generatePattern(false)),
  generate: (str) => newPattern(str),
  next: () => newPattern(generatePattern(isTrue())),
};
if (numCPUs > 1) {
  if (cluster.isMaster) {
    console.log(`Primary ${process.pid} is running`);
    var workers = {};
    process.title = "kogin";

    const cleanup = (status) => {
      return () => {
        console.log("Master stopping.");

        for (let pid in workers) {
          workers[pid].kill();
        }
        setTimeout(() => process.exit(status), 2000);
      };
    };

    let isFirst = true;
    for (let i = 0; i < numCPUs; i++) {
      const worker = cluster.fork();
      workers[worker.process.pid] = worker;
      if (isFirst) {
        worker.process.title = "telegram";
        worker.send({ name: "telegram" });
        isFirst = false;
      } else {
        worker.process.title = "web";
        worker.send({ name: "web" });
      }
    }
    cluster.on("exit", (worker, code, signal) => {
      console.log(`worker ${worker.process.title} died`);
    });
    process.on("uncaughtException", (err, origin) => {
      console.error(err, origin);
      cleanup(1)();
    });
    if (process.platform === "win32") {
      var rl = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.on("SIGINT", () => {
        process.emit("SIGINT");
      });
    }
    process.on("SIGTERM", cleanup(0));
    process.on("SIGINT", cleanup(0));
  } else {
    console.log(`Worker ${process.pid} is running`);
    let close = undefined;
    process.on("message", (message) => {
      if (message.name === "telegram") {
        console.log("TELEGRAM");
        process.title = "telegram";
        close = startTelegramServices(config, router);
      } else {
        console.log("WEB");
        process.title = "web";
        close = startWebService(config, router);
      }
    });
    process.on("exit", async () => {
      console.log("Stopping worker " + process.pid);
      if (close) {
        await close();
      }
    });
  }
} else {
  const stopTelegram = startTelegramServices(config, router);
  const stopWeb = startWebService(config, router);
  const cleanup = async () => {
    try {
      await stopTelegram();
      await stopWeb();
    } catch (error) {
      console.error("Service close error", error);
    }
    console.log("Server stoped");
    process.exit(0);
  };

  if (process.platform === "win32") {
    var rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("SIGINT", () => {
      process.emit("SIGINT");
    });
  }
  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
  process.on("uncaughtException", (err, origin) => {
    console.error(err, origin);
    cleanup();
  });
}

//app(config);
