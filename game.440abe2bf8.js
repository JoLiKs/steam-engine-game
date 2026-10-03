(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __objRest = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };

  // src/core/data.js
  var POP_START = 1e3;
  var COAL_MAX = 99;
  var CAP = [5.6, 8.5, 6.5, 3.2];
  var DISTRICTS = [
    { id: "hosp", name: "\u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044C", short: "\u0413\u041E\u0421\u041F", icon: "cross" },
    { id: "home", name: "\u041A\u0432\u0430\u0440\u0442\u0430\u043B\u044B", short: "\u0414\u041E\u041C\u0410", icon: "house" },
    { id: "fact", name: "\u0417\u0430\u0432\u043E\u0434", short: "\u0417\u0410\u0412\u041E\u0414", icon: "factory" },
    { id: "scrub", name: "\u0424\u0438\u043B\u044C\u0442\u0440\u044B", short: "\u0424\u0418\u041B\u042C\u0422\u0420", icon: "filter" }
  ];
  var NIGHTS = [
    { name: "\u0420\u0430\u0441\u0442\u043E\u043F\u043A\u0430", dur: 42, need: [1.5, 2.2, 3, 1.2], leakEvery: 0, events: [], sub: "\u041F\u0435\u0440\u0432\u0430\u044F \u043D\u043E\u0447\u044C \u0443 \u0441\u0442\u0430\u0440\u043E\u0439 \u0410\u0433\u0430\u0444\u044C\u0438" },
    { name: "\u041F\u0435\u0440\u0432\u044B\u0439 \u0438\u043D\u0435\u0439", dur: 55, need: [2, 2.9, 3.4, 1.4], leakEvery: 22, events: [{ t0: 26, t1: 40, d: 1, m: 1.3, label: "\u0425\u043E\u043B\u043E\u0434\u043D\u044B\u0439 \u0432\u0435\u0442\u0435\u0440 \u0441 \u0440\u0435\u043A\u0438" }], sub: "\u0413\u043E\u0440\u043E\u0434 \u0432\u043F\u0435\u0440\u0432\u044B\u0435 \u043F\u0440\u043E\u0441\u0438\u0442 \u0431\u043E\u043B\u044C\u0448\u0435" },
    { name: "\u041B\u0438\u0445\u043E\u0440\u0430\u0434\u043A\u0430", dur: 55, need: [2.4, 3.3, 3.5, 1.5], leakEvery: 19, events: [{ t0: 18, t1: 36, d: 0, m: 1.5, label: "\u041B\u0438\u0445\u043E\u0440\u0430\u0434\u043A\u0430 \u0432 \u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u0435" }], sub: "\u041F\u0430\u043B\u0430\u0442\u044B \u0437\u0430\u043F\u043E\u043B\u043D\u044F\u044E\u0442\u0441\u044F" },
    { name: "\u0414\u043E\u043B\u0433\u0430\u044F \u0441\u043C\u0435\u043D\u0430", dur: 55, need: [2.5, 3.7, 3.6, 1.6], leakEvery: 18, events: [{ t0: 30, t1: 46, d: 1, m: 1.35, label: "\u041C\u043E\u0440\u043E\u0437 \u043A\u0440\u0435\u043F\u0447\u0430\u0435\u0442" }], sub: "\u0417\u0430\u0432\u043E\u0434 \u043F\u0440\u043E\u0441\u0438\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 \u0432\u0440\u0435\u043C\u0435\u043D\u0438" },
    { name: "\u0414\u044B\u043C", dur: 55, need: [2.6, 4.1, 3.6, 1.7], leakEvery: 16, events: [{ t0: 14, t1: 30, d: 0, m: 1.4, label: "\u041A\u0430\u0448\u0435\u043B\u044C \u0432 \u043F\u0430\u043B\u0430\u0442\u0430\u0445" }, { t0: 36, t1: 50, d: 1, m: 1.3, label: "\u041C\u0435\u0442\u0435\u043B\u044C" }], sub: "\u0412\u043E\u0437\u0434\u0443\u0445 \u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0441\u044F \u0442\u044F\u0436\u0451\u043B\u044B\u043C" },
    { name: "\u041C\u0435\u0442\u0435\u043B\u044C", dur: 55, need: [2.7, 4.5, 3.7, 1.7], leakEvery: 15, events: [{ t0: 20, t1: 42, d: 1, m: 1.4, label: "\u0421\u043D\u0435\u0436\u043D\u0430\u044F \u0431\u0443\u0440\u044F" }], sub: "\u0422\u0440\u0443\u0431\u044B \u0433\u0443\u0434\u044F\u0442 \u043E\u0442 \u0445\u043E\u043B\u043E\u0434\u0430" },
    { name: "\u0427\u0451\u0440\u043D\u044B\u0439 \u043B\u0451\u0434", dur: 55, need: [2.8, 4.8, 3.7, 1.8], leakEvery: 14, events: [{ t0: 12, t1: 26, d: 0, m: 1.4, label: "\u041E\u0431\u043C\u043E\u0440\u043E\u0436\u0435\u043D\u043D\u044B\u0435 \u0432 \u043F\u0440\u0438\u0451\u043C\u043D\u043E\u043C" }, { t0: 34, t1: 50, d: 1, m: 1.3, label: "\u0427\u0451\u0440\u043D\u044B\u0439 \u043B\u0451\u0434 \u043D\u0430 \u043A\u0440\u044B\u0448\u0430\u0445" }], sub: "\u0421\u043B\u043E\u0431\u043E\u0434\u0430 \u0437\u0430\u043C\u0435\u0440\u0437\u0430\u0435\u0442" },
    { name: "\u0421\u0442\u044B\u043B\u044B\u0439 \u0447\u0430\u0441", dur: 55, need: [3, 5.1, 3.8, 1.8], leakEvery: 13, events: [{ t0: 22, t1: 44, d: 1, m: 1.35, label: "\u0421\u0430\u043C\u0430\u044F \u0434\u043B\u0438\u043D\u043D\u0430\u044F \u043D\u043E\u0447\u044C" }], sub: "\u0423\u0433\u043E\u043B\u044C \u043D\u0430 \u0438\u0441\u0445\u043E\u0434\u0435" },
    { name: "\u0411\u0443\u0440\u044F", dur: 55, need: [3.1, 5.4, 3.8, 1.9], leakEvery: 12, events: [{ t0: 10, t1: 28, d: 1, m: 1.3, label: "\u0423\u0440\u0430\u0433\u0430\u043D\u043D\u044B\u0439 \u0432\u0435\u0442\u0435\u0440" }, { t0: 34, t1: 50, d: 0, m: 1.4, label: "\u041F\u043E\u0442\u043E\u043A \u0440\u0430\u043D\u0435\u043D\u044B\u0445" }], sub: "\u041F\u043E\u0447\u0442\u0438 \u0443 \u0446\u0435\u043B\u0438" },
    { name: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u043D\u043E\u0447\u044C", dur: 60, need: [3.2, 5.6, 3.8, 1.9], leakEvery: 11, events: [{ t0: 16, t1: 36, d: 1, m: 1.3, label: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043C\u043E\u0440\u043E\u0437" }, { t0: 40, t1: 54, d: 0, m: 1.3, label: "\u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044C \u043F\u0435\u0440\u0435\u043F\u043E\u043B\u043D\u0435\u043D" }], sub: "\u041E\u0431\u043E\u0437 \u0441 \u0443\u0433\u043B\u0451\u043C \u0443\u0436\u0435 \u0432 \u043F\u0443\u0442\u0438" }
  ];
  var TICKER = {
    1: [{ t: 12, who: "\u0414\u043E\u043A\u0442\u043E\u0440 \u0418\u0432\u0438\u043D\u0430", text: "\u041F\u0430\u0440 \u043D\u0430 \u043F\u0430\u043B\u0430\u0442\u044B, \u043A\u043E\u0447\u0435\u0433\u0430\u0440. \u0414\u0435\u0442\u0438 \u043A\u0430\u0448\u043B\u044F\u044E\u0442 \u0443\u0436\u0435 \u0442\u0440\u0435\u0442\u0438\u0439 \u0434\u0435\u043D\u044C." }, { t: 34, who: "\u0422\u0438\u043C\u043A\u0430", text: "\u0414\u044F\u0434\u044F, \u0430 \u043F\u0440\u0430\u0432\u0434\u0430, \u0447\u0442\u043E \u0410\u0433\u0430\u0444\u044C\u044F \u0441\u0442\u0430\u0440\u0448\u0435 \u043D\u0430\u0448\u0435\u0433\u043E \u0433\u043E\u0440\u043E\u0434\u0430?" }],
    2: [{ t: 8, who: "\u0414\u043E\u043A\u0442\u043E\u0440 \u0418\u0432\u0438\u043D\u0430", text: "\u041B\u0438\u0445\u043E\u0440\u0430\u0434\u043A\u0430. \u0415\u0441\u043B\u0438 \u043F\u0430\u043B\u0430\u0442\u044B \u043E\u0441\u0442\u044B\u043D\u0443\u0442, \u043C\u044B \u043F\u043E\u0442\u0435\u0440\u044F\u0435\u043C \u043B\u044E\u0434\u0435\u0439." }, { t: 40, who: "\u0413\u0440\u043E\u043C\u043E\u0432", text: "\u0417\u0430\u0432\u043E\u0434 \u0441\u0442\u043E\u0438\u0442 \u2014 \u0443\u0433\u043E\u043B\u044C \u043D\u0435 \u0440\u0430\u0441\u0442\u0451\u0442. \u0414\u0443\u043C\u0430\u0439, \u043A\u043E\u0447\u0435\u0433\u0430\u0440." }],
    3: [{ t: 10, who: "\u0413\u0440\u043E\u043C\u043E\u0432", text: "\u041B\u044E\u0434\u0438 \u0434\u0435\u0440\u0436\u0430\u0442\u0441\u044F. \u041F\u043E\u043A\u0430 \u0434\u0435\u0440\u0436\u0430\u0442\u0441\u044F." }, { t: 44, who: "\u0422\u0438\u043C\u043A\u0430", text: "\u042F \u043C\u043E\u0433\u0443 \u0442\u0430\u0441\u043A\u0430\u0442\u044C \u0443\u0433\u043E\u043B\u044C. \u042F \u0431\u044B\u0441\u0442\u0440\u044B\u0439!" }],
    4: [{ t: 8, who: "\u0414\u043E\u043A\u0442\u043E\u0440 \u0418\u0432\u0438\u043D\u0430", text: "\u041A\u043E\u043F\u043E\u0442\u044C \u043E\u0441\u0435\u0434\u0430\u0435\u0442 \u0432 \u043B\u0451\u0433\u043A\u0438\u0445. \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0444\u0438\u043B\u044C\u0442\u0440\u044B, \u0435\u0441\u043B\u0438 \u043C\u043E\u0436\u0435\u0442\u0435." }, { t: 40, who: "\u0420\u0430\u0431\u043E\u0447\u0438\u0439", text: "\u0420\u0443\u043A\u0438 \u043D\u0435 \u0434\u0435\u0440\u0436\u0430\u0442 \u043B\u043E\u043F\u0430\u0442\u0443, \u043C\u0430\u0441\u0442\u0435\u0440\u2026" }],
    5: [{ t: 10, who: "\u0421\u043B\u043E\u0431\u043E\u0434\u0430", text: "\u041C\u044B \u0437\u0430\u043C\u0435\u0440\u0437\u0430\u0435\u043C. \u0422\u0440\u0443\u0431\u044B \u043A \u043D\u0430\u043C \u043F\u043E\u0447\u0442\u0438 \u043D\u0435 \u0438\u0434\u0443\u0442." }, { t: 38, who: "\u0418\u0432\u0438\u043D\u0430", text: "\u0414\u044B\u043C \u043D\u0430\u0434 \u043A\u0440\u044B\u0448\u0430\u043C\u0438. \u0414\u044B\u0448\u0430\u0442\u044C \u043D\u0435\u0447\u0435\u043C." }],
    6: [{ t: 8, who: "\u0413\u0440\u043E\u043C\u043E\u0432", text: "\u0421\u043C\u0435\u043D\u0430 \u043D\u0430 \u043D\u043E\u0433\u0430\u0445 \u0434\u0432\u0430\u0434\u0446\u0430\u0442\u044B\u0439 \u0447\u0430\u0441." }, { t: 40, who: "\u0422\u0438\u043C\u043A\u0430", text: "\u0414\u044F\u0434\u044F, \u0442\u044B \u0441\u043F\u0430\u043B \u0441\u0435\u0433\u043E\u0434\u043D\u044F?" }],
    7: [{ t: 10, who: "\u041C\u044D\u0440", text: "\u0413\u043E\u0440\u043E\u0434 \u0441\u043C\u043E\u0442\u0440\u0438\u0442 \u043D\u0430 \u0432\u0430\u0448\u0443 \u0442\u0440\u0443\u0431\u0443. \u041D\u0435 \u043F\u043E\u0434\u0432\u0435\u0434\u0438\u0442\u0435." }, { t: 40, who: "\u0418\u0432\u0438\u043D\u0430", text: "\u041C\u044B \u0434\u0435\u0440\u0436\u0438\u043C\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430 \u0432\u0430\u0448\u0435\u043C \u043F\u0430\u0440\u0435." }],
    8: [{ t: 8, who: "\u0422\u0435\u043B\u0435\u0433\u0440\u0430\u0444", text: "\u041E\u0431\u043E\u0437 \u0441 \u0443\u0433\u043B\u0451\u043C \u0432\u044B\u0448\u0435\u043B \u0441 \u044E\u0433\u0430. \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C\u0441\u044F." }, { t: 42, who: "\u0413\u0440\u043E\u043C\u043E\u0432", text: "\u0410\u0433\u0430\u0444\u044C\u044F \u0434\u0440\u043E\u0436\u0438\u0442, \u043D\u043E \u0442\u044F\u043D\u0435\u0442." }],
    9: [{ t: 8, who: "\u0422\u0435\u043B\u0435\u0433\u0440\u0430\u0444", text: "\u041E\u0442\u0442\u0435\u043F\u0435\u043B\u044C \u043D\u0430 \u0440\u0430\u0441\u0441\u0432\u0435\u0442\u0435. \u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0435 \u0443\u0441\u0438\u043B\u0438\u0435!" }, { t: 44, who: "\u0422\u0438\u043C\u043A\u0430", text: "\u0414\u044F\u0434\u044F, \u0441\u043C\u043E\u0442\u0440\u0438 \u2014 \u043D\u0430 \u0432\u043E\u0441\u0442\u043E\u043A\u0435 \u0441\u0432\u0435\u0442\u043B\u0435\u0435\u0442?" }]
  };
  var CARDS = {
    1: {
      id: "timka",
      title: "\u0422\u0438\u043C\u043A\u0430 \u0443 \u043A\u043E\u0442\u043B\u0430",
      who: "\u0422\u0438\u043C\u043A\u0430, \u043F\u043E\u0441\u044B\u043B\u044C\u043D\u044B\u0439 (12 \u043B\u0435\u0442)",
      text: "\u041C\u0430\u043B\u044C\u0447\u0438\u0448\u043A\u0430 \u0441\u0442\u043E\u0438\u0442 \u0432 \u0434\u0432\u0435\u0440\u044F\u0445 \u0441 \u043B\u043E\u043F\u0430\u0442\u043E\u0439 \u043F\u043E\u0447\u0442\u0438 \u0432\u044B\u0448\u0435 \u0441\u0435\u0431\u044F. \xAB\u042F \u0431\u0443\u0434\u0443 \u043F\u043E\u0434\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0442\u044C \u0443\u0433\u043E\u043B\u044C, \u043F\u043E\u043A\u0430 \u0432\u044B \u043D\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0435\u0442\u0435 \u0432\u0435\u043D\u0442\u0438\u043B\u0438. \u041C\u043D\u0435 \u0437\u0430 \u044D\u0442\u043E \u0434\u0430\u0434\u0443\u0442 \u043F\u0430\u0451\u043A\xBB.",
      options: [
        { key: "help", label: "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044C \u043F\u043E\u043C\u043E\u0433\u0430\u0442\u044C", hint: "\u041F\u043E\u0434\u0440\u0443\u0447\u043D\u044B\u0439 \u043F\u043E\u0434\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442 \u0443\u0433\u043E\u043B\u044C \u0441\u0430\u043C, \u043A\u043E\u0433\u0434\u0430 \u0442\u043E\u043F\u043A\u0430 \u0441\u0442\u044B\u043D\u0435\u0442. \u041D\u043E \u044D\u0442\u043E \u2014 \u0434\u0435\u0442\u0441\u043A\u0438\u0439 \u0442\u0440\u0443\u0434.", effect: "\u0422\u0438\u043C\u043A\u0430 \u0431\u0440\u043E\u0441\u0430\u0435\u0442 \u0443\u0433\u043E\u043B\u044C, \u043A\u043E\u0433\u0434\u0430 \u0442\u043E\u043F\u043A\u0430 \u043E\u0441\u0442\u044B\u0432\u0430\u0435\u0442" },
        { key: "ration", label: "\u0414\u0430\u0442\u044C \u043F\u0430\u0451\u043A \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0434\u043E\u043C\u043E\u0439", hint: "\u22126 \u0443\u0433\u043B\u044F \u0438\u0437 \u0437\u0430\u043F\u0430\u0441\u043E\u0432. \u0420\u0430\u0431\u043E\u0442\u0430\u0435\u0442\u0435 \u0441\u0430\u043C\u0438.", effect: "\u22126 \u0443\u0433\u043B\u044F, \u0432\u0441\u0451 \u043F\u043E-\u043F\u0440\u0435\u0436\u043D\u0435\u043C\u0443" }
      ]
    },
    3: {
      id: "shift",
      title: "\u041F\u0440\u043E\u0441\u044C\u0431\u0430 \u0413\u0440\u043E\u043C\u043E\u0432\u0430",
      who: "\u041C\u0430\u0441\u0442\u0435\u0440 \u0413\u0440\u043E\u043C\u043E\u0432, \u0437\u0430\u0432\u043E\u0434",
      text: "\xAB\u041A\u043E\u0447\u0435\u0433\u0430\u0440, \u043D\u0430\u043C \u043D\u0443\u0436\u0435\u043D \u0443\u0433\u043E\u043B\u044C. \u0414\u0430\u0439 \u0434\u0432\u043E\u0439\u043D\u0443\u044E \u0441\u043C\u0435\u043D\u0443 \u2014 \u0432\u044B\u0434\u0430\u0434\u0438\u043C \u043D\u0430 \u0442\u0440\u0435\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435. \u041B\u044E\u0434\u0438 \u0432\u044B\u0434\u0435\u0440\u0436\u0430\u0442. \u041D\u0430\u0432\u0435\u0440\u043D\u043E\u0435\xBB.",
      options: [
        { key: "extend", label: "\u0423\u0434\u043B\u0438\u043D\u0438\u0442\u044C \u0441\u043C\u0435\u043D\u0443", hint: "\u0423\u0433\u043E\u043B\u044C \u0441 \u0437\u0430\u0432\u043E\u0434\u0430 \xD71.35, \u043D\u043E \u0440\u0430\u0431\u043E\u0447\u0438\u0435 \u0443\u0441\u0442\u0430\u044E\u0442 \u043D\u0430 40% \u0431\u044B\u0441\u0442\u0440\u0435\u0435.", effect: "\u0417\u0430\u0432\u043E\u0434 \u0434\u0430\u0451\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 \u0443\u0433\u043B\u044F, \u0440\u0430\u0431\u043E\u0447\u0438\u0435 \u0432\u044B\u043C\u0430\u0442\u044B\u0432\u0430\u044E\u0442\u0441\u044F" },
        { key: "refuse", label: "\u041E\u0442\u043A\u0430\u0437\u0430\u0442\u044C", hint: "\u041E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0441\u043C\u0435\u043D\u0443 \u043A\u0430\u043A \u0435\u0441\u0442\u044C.", effect: "\u0421\u043C\u0435\u043D\u044B \u043F\u0440\u0435\u0436\u043D\u0438\u0435" }
      ]
    },
    5: {
      id: "brown",
      title: "\u0411\u0443\u0440\u044B\u0439 \u0443\u0433\u043E\u043B\u044C",
      who: "\u0413\u043E\u0440\u043E\u0434\u0441\u043A\u043E\u0439 \u0441\u043E\u0432\u0435\u0442",
      text: "\xAB\u0415\u0441\u0442\u044C \u0432\u0430\u0433\u043E\u043D \u0431\u0443\u0440\u043E\u0433\u043E \u0443\u0433\u043B\u044F \u2014 \u0434\u0435\u0448\u0451\u0432\u043E\u0433\u043E, \u0436\u0438\u0440\u043D\u043E\u0433\u043E, \u0434\u044B\u043C\u043D\u043E\u0433\u043E. \u0425\u0432\u0430\u0442\u0438\u0442 \u043D\u0430 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043D\u043E\u0447\u0435\u0439. \u0414\u044B\u0448\u0430\u0442\u044C \u0431\u0443\u0434\u0435\u0442 \u0442\u0440\u0443\u0434\u043D\u0435\u0435, \u043D\u043E \u043A\u0442\u043E \u0441\u0447\u0438\u0442\u0430\u0435\u0442?\xBB",
      options: [
        { key: "accept", label: "\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u0432\u0430\u0433\u043E\u043D", hint: "+32 \u0443\u0433\u043B\u044F, \u043D\u043E \u0434\u044B\u043C\u0430 \u043E\u0442 \u0442\u043E\u043F\u043A\u0438 \u043D\u0430 60% \u0431\u043E\u043B\u044C\u0448\u0435.", effect: "+32 \u0443\u0433\u043B\u044F, \u0434\u044B\u043C \u0433\u0443\u0449\u0435" },
        { key: "decline", label: "\u041E\u0442\u043A\u0430\u0437\u0430\u0442\u044C\u0441\u044F", hint: "\u0422\u043E\u043F\u0438\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u043C, \u0447\u0442\u043E \u0435\u0441\u0442\u044C.", effect: "\u0412\u043E\u0437\u0434\u0443\u0445 \u0447\u0438\u0449\u0435, \u0443\u0433\u043B\u044F \u043C\u0435\u043D\u044C\u0448\u0435" }
      ]
    },
    7: {
      id: "sloboda",
      title: "\u0421\u043B\u043E\u0431\u043E\u0434\u0430",
      who: "\u0421\u0442\u0430\u0440\u0448\u0430\u044F \u0441\u043B\u043E\u0431\u043E\u0434\u044B, \u041C\u0430\u0440\u0444\u0430",
      text: "\xAB\u0423 \u043D\u0430\u0441 \u0434\u0435\u0442\u0438 \u0441\u043F\u044F\u0442 \u0432 \u0448\u0443\u0431\u0430\u0445. \u041F\u0440\u0438\u0448\u043B\u0438\u0442\u0435 \u0445\u043E\u0442\u044C \u043D\u0435\u043C\u043D\u043E\u0433\u043E \u0443\u0433\u043B\u044F \u0432 \u043D\u0430\u0448\u0438 \u043F\u0435\u0447\u0438, \u0430 \u0432\u044B \u0441\u0430\u043C\u0438 \u043A\u0430\u043A-\u043D\u0438\u0431\u0443\u0434\u044C\u2026\xBB",
      options: [
        { key: "aid", label: "\u041E\u0442\u0434\u0430\u0442\u044C \u0447\u0430\u0441\u0442\u044C \u0437\u0430\u043F\u0430\u0441\u043E\u0432", hint: "\u221218 \u0443\u0433\u043B\u044F. \u0425\u043E\u043B\u043E\u0434 \u0432 \u043A\u0432\u0430\u0440\u0442\u0430\u043B\u0430\u0445 \u0442\u0435\u043F\u0435\u0440\u044C \u0443\u0431\u0438\u0432\u0430\u0435\u0442 \u0432\u0434\u0432\u043E\u0435 \u0440\u0435\u0436\u0435.", effect: "\u221218 \u0443\u0433\u043B\u044F, \u043A\u0432\u0430\u0440\u0442\u0430\u043B\u044B \u0443\u0441\u0442\u043E\u0439\u0447\u0438\u0432\u0435\u0435" },
        { key: "keep", label: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0430\u0441\u044B", hint: "\u041E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0443\u0433\u043E\u043B\u044C \u0434\u043B\u044F \u043A\u043E\u0442\u043B\u0430.", effect: "\u0423\u0433\u043E\u043B\u044C \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0432 \u0431\u0443\u043D\u043A\u0435\u0440\u0435" }
      ]
    }
  };
  var ENDINGS = {
    light: { id: "light", title: "\u0421\u0432\u0435\u0442 \u0432 \u043A\u0430\u0436\u0434\u043E\u043C \u043E\u043A\u043D\u0435", tone: "good", lines: [
      "\u041D\u0430 \u0440\u0430\u0441\u0441\u0432\u0435\u0442\u0435 \u043A \u0432\u043E\u0440\u043E\u0442\u0430\u043C \u0424\u0435\u0440\u0440\u043E\u0433\u0440\u0430\u0434\u0430 \u043F\u0440\u0438\u0448\u0451\u043B \u043E\u0431\u043E\u0437 \u0441 \u0443\u0433\u043B\u0451\u043C, \u0438 \u043F\u0435\u0440\u0432\u044B\u043C, \u043A\u043E\u0433\u043E \u0432\u0441\u0442\u0440\u0435\u0442\u0438\u043B\u0438 \u0432\u043E\u0437\u0447\u0438\u043A\u0438, \u0431\u044B\u043B \u0436\u0438\u0432\u043E\u0439 \u0433\u043E\u0440\u043E\u0434.",
      "\u0412\u044B \u043D\u0435 \u0437\u0430\u0431\u0440\u0430\u043B\u0438 \u0447\u0443\u0436\u043E\u0433\u043E \u0432\u043E\u0437\u0434\u0443\u0445\u0430 \u0438 \u0447\u0443\u0436\u043E\u0439 \u0443\u0441\u0442\u0430\u043B\u043E\u0441\u0442\u0438. \u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044C \u0442\u0451\u043F\u043B\u044B\u0439, \u043D\u0435\u0431\u043E \u043D\u0430\u0434 \u0442\u0440\u0443\u0431\u0430\u043C\u0438 \u0441\u0432\u0435\u0442\u043B\u0435\u0435\u0442.",
      "\u0410\u0433\u0430\u0444\u044C\u044F \u0442\u0438\u0445\u043E \u043E\u0441\u0442\u044B\u0432\u0430\u0435\u0442. \u0412\u044B \u0432\u044B\u0442\u0438\u0440\u0430\u0435\u0442\u0435 \u0440\u0443\u043A\u0438 \u0438 \u0432\u043F\u0435\u0440\u0432\u044B\u0435 \u0437\u0430 \u0434\u0435\u0441\u044F\u0442\u044C \u043D\u043E\u0447\u0435\u0439 \u0441\u043B\u044B\u0448\u0438\u0442\u0435, \u043A\u0430\u043A \u0437\u0430 \u0441\u0442\u0435\u043D\u043E\u0439 \u0441\u043C\u0435\u044E\u0442\u0441\u044F \u0434\u0435\u0442\u0438."
    ] },
    smoke: { id: "smoke", title: "\u0414\u044B\u043C \u043D\u0430\u0434 \u0433\u043E\u0440\u043E\u0434\u043E\u043C", tone: "bitter", lines: [
      "\u0413\u043E\u0440\u043E\u0434 \u043F\u0435\u0440\u0435\u0436\u0438\u043B \u0437\u0438\u043C\u0443. \u041D\u043E \u043A\u043E\u043F\u043E\u0442\u044C \u043B\u0435\u0433\u043B\u0430 \u043D\u0430 \u043A\u0440\u044B\u0448\u0438, \u043D\u0430 \u0431\u0435\u043B\u044C\u0451, \u043D\u0430 \u043B\u0451\u0433\u043A\u0438\u0435 \u0442\u0435\u0445, \u043A\u0442\u043E \u043E\u0441\u0442\u0430\u043B\u0441\u044F.",
      "\u0414\u043E\u043A\u0442\u043E\u0440 \u0418\u0432\u0438\u043D\u0430 \u0431\u0443\u0434\u0435\u0442 \u043B\u0435\u0447\u0438\u0442\u044C \u043A\u0430\u0448\u0435\u043B\u044C \u0435\u0449\u0451 \u043C\u043D\u043E\u0433\u043E \u043B\u0435\u0442. \u0412\u044B \u0441\u043E\u0433\u0440\u0435\u043B\u0438 \u043B\u044E\u0434\u0435\u0439 \u2014 \u0438 \u043E\u0442\u0440\u0430\u0432\u0438\u043B\u0438 \u0442\u043E, \u0440\u0430\u0434\u0438 \u0447\u0435\u0433\u043E \u0438\u0445 \u0433\u0440\u0435\u043B\u0438.",
      "\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u0430\u043C \u0440\u0435\u0448\u0430\u0442\u044C, \u0447\u0442\u043E \u0432\u044B \u043E\u0441\u0442\u0430\u0432\u0438\u0442\u0435 \u043F\u043E\u0441\u043B\u0435 \u0441\u0435\u0431\u044F: \u0442\u0435\u043F\u043B\u043E \u0438\u043B\u0438 \u0447\u0438\u0441\u0442\u043E\u0435 \u043D\u0435\u0431\u043E. \u0412 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0440\u0430\u0437 \u2014 \u043E\u0431\u0430."
    ] },
    iron: { id: "iron", title: "\u0416\u0435\u043B\u0435\u0437\u043D\u044B\u0435 \u043B\u044E\u0434\u0438", tone: "bitter", lines: [
      "\u0413\u043E\u0440\u043E\u0434 \u0432\u044B\u0436\u0438\u043B \u2014 \u043D\u0430 \u043F\u043B\u0435\u0447\u0430\u0445 \u0442\u0435\u0445, \u043A\u0442\u043E \u0441\u0442\u043E\u044F\u043B \u0443 \u0441\u0442\u0430\u043D\u043A\u043E\u0432, \u043F\u043E\u043A\u0430 \u043D\u0435 \u043F\u0430\u0434\u0430\u043B. \u0417\u0430\u0432\u043E\u0434 \u0434\u0430\u043B \u0443\u0433\u043E\u043B\u044C, \u0430 \u043B\u044E\u0434\u0438 \u0434\u0430\u043B\u0438 \u0431\u043E\u043B\u044C\u0448\u0435, \u0447\u0435\u043C \u043C\u043E\u0433\u043B\u0438.",
      "\u0413\u0440\u043E\u043C\u043E\u0432 \u043C\u043E\u043B\u0447\u0438\u0442. \u0415\u0433\u043E \u0441\u043C\u0435\u043D\u0430 \u043D\u0435 \u0432\u0435\u0440\u043D\u0451\u0442\u0441\u044F \u043F\u0440\u0435\u0436\u043D\u0435\u0439. \u0422\u0438\u043C\u043A\u0430 \u0442\u0430\u043A \u0438 \u043D\u0435 \u043D\u0430\u0443\u0447\u0438\u043B\u0441\u044F \u0441\u043C\u0435\u044F\u0442\u044C\u0441\u044F \u0432 \u0433\u043E\u043B\u043E\u0441.",
      "\u0422\u0435\u043F\u043B\u043E \u043D\u0435 \u0431\u044B\u0432\u0430\u0435\u0442 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u043C. \u0412\u043E\u043F\u0440\u043E\u0441 \u043B\u0438\u0448\u044C \u2014 \u043A\u0442\u043E \u043F\u043B\u0430\u0442\u0438\u0442. \u0412\u044B \u0437\u043D\u0430\u0435\u0442\u0435 \u043E\u0442\u0432\u0435\u0442."
    ] },
    cold: { id: "cold", title: "\u0425\u043E\u043B\u043E\u0434\u043D\u044B\u0439 \u0440\u0430\u0441\u0447\u0451\u0442", tone: "dark", lines: [
      "\u0410\u0433\u0430\u0444\u044C\u044F \u0436\u0438\u0432\u0430. \u0422\u0440\u0443\u0431\u044B \u0446\u0435\u043B\u044B. \u041D\u043E \u043C\u043D\u043E\u0433\u0438\u0435 \u043E\u043A\u043D\u0430 \u0442\u0430\u043A \u0438 \u043E\u0441\u0442\u0430\u043B\u0438\u0441\u044C \u0442\u0451\u043C\u043D\u044B\u043C\u0438.",
      "\u0412\u044B \u0441\u0447\u0438\u0442\u0430\u043B\u0438 \u0434\u0430\u0432\u043B\u0435\u043D\u0438\u0435, \u0443\u0433\u043E\u043B\u044C, \u0441\u043C\u0435\u043D\u044B \u2014 \u0438 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0447\u0430\u0441\u0442\u043E \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u043B\u0438 \u043B\u044E\u0434\u0435\u0439. \u0413\u043E\u0440\u043E\u0434 \u0432\u0441\u0442\u0440\u0435\u0447\u0430\u0435\u0442 \u043E\u0431\u043E\u0437, \u043D\u043E \u0442\u0438\u0448\u0435, \u0447\u0435\u043C \u0434\u043E\u043B\u0436\u0435\u043D.",
      "\u041C\u0430\u0448\u0438\u043D\u0430 \u043D\u0435 \u0441\u043F\u0430\u0441\u0451\u0442 \u0442\u0435\u0445, \u043E \u043A\u043E\u043C \u0437\u0430\u0431\u044B\u043B \u043C\u0430\u0448\u0438\u043D\u0438\u0441\u0442."
    ] },
    boom: { id: "boom", title: "\u0412\u0437\u0440\u044B\u0432 \u0410\u0433\u0430\u0444\u044C\u0438", tone: "fail", lines: [
      "\u0414\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0448\u043B\u043E \u0447\u0435\u0440\u0442\u0443. \u0421\u0442\u0430\u0440\u044B\u0439 \u043A\u043E\u0442\u0451\u043B, \u043F\u0435\u0440\u0435\u0436\u0438\u0432\u0448\u0438\u0439 \u0442\u0440\u0438 \u043F\u043E\u043A\u043E\u043B\u0435\u043D\u0438\u044F \u043A\u043E\u0447\u0435\u0433\u0430\u0440\u043E\u0432, \u043D\u0435 \u0432\u044B\u0434\u0435\u0440\u0436\u0430\u043B.",
      "\u041D\u0430\u0434 \u0424\u0435\u0440\u0440\u043E\u0433\u0440\u0430\u0434\u043E\u043C \u043F\u043E\u0434\u043D\u044F\u043B\u0441\u044F \u0431\u0435\u043B\u044B\u0439 \u0441\u0442\u043E\u043B\u0431 \u043F\u0430\u0440\u0430, \u0430 \u043F\u043E\u0442\u043E\u043C \u043D\u0430\u0441\u0442\u0443\u043F\u0438\u043B\u0430 \u0442\u0438\u0448\u0438\u043D\u0430. \u0425\u043E\u043B\u043E\u0434\u043D\u0430\u044F.",
      "\u041F\u043E\u043C\u043D\u0438\u0442\u0435: \u043A\u043E\u0442\u0451\u043B \u2014 \u043D\u0435 \u0432\u0440\u0430\u0433. \u042D\u0442\u043E \u0432\u0430\u0448 \u043F\u0430\u0440\u0442\u043D\u0451\u0440, \u0438 \u0435\u043C\u0443 \u043D\u0443\u0436\u0435\u043D \u043F\u043E\u043A\u043E\u0439."
    ] },
    silence: { id: "silence", title: "\u0422\u0438\u0448\u0438\u043D\u0430", tone: "fail", lines: [
      "\u041E\u0433\u043D\u0438 \u0432 \u043E\u043A\u043D\u0430\u0445 \u0433\u0430\u0441\u043B\u0438 \u043E\u0434\u0438\u043D \u0437\u0430 \u0434\u0440\u0443\u0433\u0438\u043C. \u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044C, \u043A\u0432\u0430\u0440\u0442\u0430\u043B\u044B, \u0441\u043B\u043E\u0431\u043E\u0434\u0430.",
      "\u041A\u043E\u0433\u0434\u0430 \u043E\u0431\u043E\u0437 \u043F\u0440\u0438\u0448\u0451\u043B, \u0435\u043C\u0443 \u0431\u044B\u043B\u043E \u043D\u0435\u043A\u043E\u043C\u0443 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u0432\u043E\u0440\u043E\u0442\u0430.",
      "\u041F\u0430\u0440 \u2014 \u044D\u0442\u043E \u0436\u0438\u0437\u043D\u044C. \u0410 \u0432\u044B\u0431\u043E\u0440, \u043A\u043E\u043C\u0443 \u0435\u0433\u043E \u043E\u0442\u0434\u0430\u0442\u044C, \u043D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u0431\u044B\u0432\u0430\u0435\u0442 \u043B\u0451\u0433\u043A\u0438\u043C."
    ] }
  };
  var TUTORIAL = [
    { id: "shovel", text: "\u0422\u043E\u043F\u043A\u0430 \u043E\u0441\u0442\u044B\u043B\u0430. \u041F\u043E\u0434\u0431\u0440\u043E\u0441\u044C\u0442\u0435 \u0443\u0433\u043E\u043B\u044C \u2014 \u041F\u0420\u041E\u0411\u0415\u041B \u0438\u043B\u0438 \u043A\u043D\u043E\u043F\u043A\u0430 \xAB\u0423\u0433\u043E\u043B\u044C\xBB.", hint: "shovel" },
    { id: "pressure", text: "\u041E\u0433\u043E\u043D\u044C \u0433\u0440\u0435\u0435\u0442 \u043A\u043E\u0442\u0451\u043B. \u041F\u043E\u0434\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0439\u0442\u0435 \u0443\u0433\u043E\u043B\u044C, \u043F\u043E\u043A\u0430 \u0441\u0442\u0440\u0435\u043B\u043A\u0430 \u0434\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u043D\u0435 \u0432\u043E\u0439\u0434\u0451\u0442 \u0432 \u0437\u0435\u043B\u0451\u043D\u0443\u044E \u0437\u043E\u043D\u0443.", hint: "gauge" },
    { id: "hosp", text: "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0432\u0435\u043D\u0442\u0438\u043B\u044C \u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044F \u0434\u043E \u0437\u043E\u043B\u043E\u0442\u043E\u0439 \u043E\u0442\u043C\u0435\u0442\u043A\u0438. \u0411\u043E\u043B\u044C\u043D\u044B\u043C \u043D\u0443\u0436\u0435\u043D \u043F\u0430\u0440 \u0432 \u043F\u0435\u0440\u0432\u0443\u044E \u043E\u0447\u0435\u0440\u0435\u0434\u044C.", hint: "v0" },
    { id: "home", text: "\u0422\u0435\u043F\u0435\u0440\u044C \u041A\u0432\u0430\u0440\u0442\u0430\u043B\u044B. \u041B\u044E\u0434\u0438 \u0437\u0430\u043C\u0435\u0440\u0437\u0430\u044E\u0442 \u2014 \u043F\u0440\u0438\u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0432\u0435\u043D\u0442\u0438\u043B\u044C \u0434\u043E \u043E\u0442\u043C\u0435\u0442\u043A\u0438.", hint: "v1" },
    { id: "fact", text: "\u0417\u0430\u0432\u043E\u0434 \u0434\u0430\u0451\u0442 \u0443\u0433\u043E\u043B\u044C, \u043D\u043E \u0440\u0430\u0431\u043E\u0447\u0438\u0435 \u0443\u0441\u0442\u0430\u044E\u0442. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0435\u0433\u043E \u0432\u0435\u043D\u0442\u0438\u043B\u044C \u0434\u043E \u043E\u0442\u043C\u0435\u0442\u043A\u0438.", hint: "v2" },
    { id: "scrub", text: "\u0424\u0438\u043B\u044C\u0442\u0440\u044B \u0447\u0438\u0441\u0442\u044F\u0442 \u0434\u044B\u043C. \u041E\u043D\u0438 \u0435\u0434\u044F\u0442 \u043F\u0430\u0440, \u043D\u043E \u0431\u0435\u0437 \u043D\u0438\u0445 \u0433\u043E\u0440\u043E\u0434 \u0437\u0430\u0434\u043E\u0445\u043D\u0451\u0442\u0441\u044F.", hint: "v3" },
    { id: "leak", text: "\u0423\u0442\u0435\u0447\u043A\u0430! \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u043E\u0431\u043B\u0430\u0447\u043A\u043E \u043F\u0430\u0440\u0430 \u043D\u0430\u0434 \u0442\u0440\u0443\u0431\u043E\u0439 (\u0438\u043B\u0438 F), \u0447\u0442\u043E\u0431\u044B \u0437\u0430\u0442\u043A\u043D\u0443\u0442\u044C \u0435\u0451.", hint: "leak" },
    { id: "go", text: "\u0413\u043E\u0442\u043E\u0432\u043E! \u0414\u0435\u0440\u0436\u0438\u0442\u0435 \u0434\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0432 \u0437\u0435\u043B\u0451\u043D\u043E\u0439 \u0437\u043E\u043D\u0435 \u0438 \u043F\u043E\u0434\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0439\u0442\u0435 \u0443\u0433\u043E\u043B\u044C, \u043F\u043E\u043A\u0430 \u043D\u0435 \u043A\u043E\u043D\u0447\u0438\u0442\u0441\u044F \u043D\u043E\u0447\u044C.", hint: null }
  ];
  var HOST_EVENTS = [
    { id: "frost", d: 0, m: 1.3, dur: 14, label: "\u041D\u043E\u0447\u043D\u043E\u0439 \u043C\u043E\u0440\u043E\u0437", text: "\u0423\u0434\u0430\u0440\u0438\u043B \u0432\u043D\u0435\u0437\u0430\u043F\u043D\u044B\u0439 \u043C\u043E\u0440\u043E\u0437 \u2014 \u0432 \u043F\u0430\u043B\u0430\u0442\u0430\u0445 \u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044F \u043F\u0440\u043E\u0441\u044F\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0430\u0440\u0430." },
    { id: "fever", d: 0, m: 1.35, dur: 12, label: "\u0422\u0440\u0435\u0432\u043E\u0433\u0430 \u0432 \u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u0435", text: "\u041F\u0440\u0438\u0432\u0435\u0437\u043B\u0438 \u043D\u043E\u0432\u044B\u0445 \u0431\u043E\u043B\u044C\u043D\u044B\u0445: \u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044E \u043D\u0443\u0436\u0435\u043D \u043F\u0430\u0440, \u0438 \u043F\u043E\u0441\u043A\u043E\u0440\u0435\u0435." },
    { id: "wind", d: 1, m: 1.3, dur: 16, label: "\u0412\u0435\u0442\u0435\u0440 \u0441 \u0440\u0435\u043A\u0438", text: "\u0412\u0435\u0442\u0435\u0440 \u0432\u044B\u0434\u0443\u0432\u0430\u0435\u0442 \u0442\u0435\u043F\u043B\u043E \u0438\u0437 \u041A\u0432\u0430\u0440\u0442\u0430\u043B\u043E\u0432 \u2014 \u0436\u0438\u0442\u0435\u043B\u0438 \u043A\u0440\u0443\u0442\u044F\u0442 \u0432\u0435\u043D\u0442\u0438\u043B\u0438 \u0441\u0430\u043C\u0438." },
    { id: "feast", d: 1, m: 1.25, dur: 14, label: "\u041F\u0440\u0430\u0437\u0434\u043D\u0438\u043A \u0432 \u041A\u0432\u0430\u0440\u0442\u0430\u043B\u0430\u0445", text: "\u0412 \u041A\u0432\u0430\u0440\u0442\u0430\u043B\u0430\u0445 \u0437\u0430\u0442\u0435\u044F\u043B\u0438 \u043F\u0440\u0430\u0437\u0434\u043D\u0438\u043A: \u0434\u0432\u0435\u0440\u0438 \u043D\u0430\u0440\u0430\u0441\u043F\u0430\u0448\u043A\u0443, \u0430 \u0442\u0435\u043F\u043B\u043E \u0443\u0445\u043E\u0434\u0438\u0442." },
    { id: "order", d: 2, m: 1.4, dur: 14, label: "\u0421\u0440\u043E\u0447\u043D\u044B\u0439 \u0437\u0430\u043A\u0430\u0437", text: "\u041D\u0430 \u0417\u0430\u0432\u043E\u0434 \u043F\u0440\u0438\u0448\u0451\u043B \u0441\u0440\u043E\u0447\u043D\u044B\u0439 \u0437\u0430\u043A\u0430\u0437 \u2014 \u0441\u0442\u0430\u043D\u043A\u0438 \u043F\u0440\u043E\u0441\u044F\u0442 \u043F\u0430\u0440\u0430 \u0441\u0432\u0435\u0440\u0445 \u043D\u043E\u0440\u043C\u044B." },
    { id: "inspect", d: 2, m: 1.25, dur: 12, label: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0417\u0430\u0432\u043E\u0434\u0430", text: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0449\u0438\u0435 \u0437\u0430\u0433\u043B\u044F\u043D\u0443\u043B\u0438 \u043D\u0430 \u0417\u0430\u0432\u043E\u0434: \u0432\u0441\u0451 \u0434\u043E\u043B\u0436\u043D\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u043A\u0430\u043A \u0447\u0430\u0441\u044B." },
    { id: "smogfront", d: 3, m: 1.35, dur: 16, label: "\u0421\u043C\u043E\u0433 \u043B\u043E\u0436\u0438\u0442\u0441\u044F", text: "\u041D\u0430\u0434 \u0433\u043E\u0440\u043E\u0434\u043E\u043C \u043B\u0451\u0433 \u0441\u043C\u043E\u0433 \u2014 \u0424\u0438\u043B\u044C\u0442\u0440\u0430\u043C \u043D\u0443\u0436\u043D\u043E \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0430\u0440\u0430, \u0447\u0442\u043E\u0431\u044B \u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C\u0441\u044F." },
    { id: "soot", d: 3, m: 1.3, dur: 12, label: "\u0421\u0430\u0436\u0430 \u0432 \u0442\u0440\u0443\u0431\u0430\u0445", text: "\u0421\u0430\u0436\u0430 \u0437\u0430\u0431\u0438\u043B\u0430 \u0442\u0440\u0443\u0431\u044B \u2014 \u0424\u0438\u043B\u044C\u0442\u0440\u044B \u0436\u0430\u0434\u043D\u043E \u043F\u0440\u043E\u0441\u044F\u0442 \u043F\u0430\u0440\u0430." }
  ];
  var mulberry = (st) => {
    st.rs = st.rs + 1831565813 >>> 0;
    let t = st.rs;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  function hostEvents(seed, n) {
    if (!(n >= 1))
      return [];
    const st = { rs: (Math.imul(seed >>> 0, 2654435761) ^ Math.imul(n + 1, 2246822507)) >>> 0 || 1 };
    const nightDur = NIGHTS[n].dur, cnt = n >= 5 ? 2 : 1, out = [], used = [];
    for (let k = 0; k < cnt; k++) {
      let i = Math.floor(mulberry(st) * HOST_EVENTS.length) % HOST_EVENTS.length;
      while (used.includes(i))
        i = (i + 1) % HOST_EVENTS.length;
      used.push(i);
      const h = HOST_EVENTS[i];
      const lo = k === 0 ? 0.15 : 0.55, hi = k === 0 ? 0.4 : 0.7;
      const t0 = Math.round(nightDur * (lo + (hi - lo) * mulberry(st)) * 10) / 10;
      const m = Math.round((h.m + (mulberry(st) - 0.5) * 0.1) * 100) / 100;
      out.push({ id: h.id, d: h.d, m, t0, t1: Math.round((t0 + h.dur) * 10) / 10, label: h.label, shown: false });
    }
    return out;
  }

  // src/core/rng.js
  function nextRand(s2) {
    s2.rs = s2.rs + 1831565813 >>> 0;
    let t = s2.rs;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function randRange(s2, a, b) {
    return a + (b - a) * nextRand(s2);
  }
  function makeRng(seed) {
    let a = seed >>> 0;
    return function() {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // src/core/sim.js
  var P_GREEN = [40, 78];
  var P_VENT = 88;
  var P_DANGER = 96;
  var FIRE_COEF = 0.16;
  var FIRE_DECAY = 0.05;
  var SHOVEL_FIRE = 15;
  var SHOVEL_CD = 0.42;
  var BOILER_CAP = 3;
  var IRON_TOLL = 40;
  var SMOKE_AVG = 30;
  var COLD_POP = 0.74;
  var SILENCE_POP = 0.5;
  function createState(seed = 1, opts = {}) {
    const s2 = {
      v: 1,
      rs: seed >>> 0 || 1,
      seed: seed >>> 0,
      phase: "night",
      night: 0,
      t: 0,
      clock: 0,
      P: 22,
      fire: 0,
      coal: 24,
      smog: 8,
      smogSum: 0,
      smogTime: 0,
      valves: [0, 0, 0, 0],
      sat: [1, 1, 1, 1],
      flow: [0, 0, 0, 0],
      needNow: [0, 0, 0, 0],
      pop: POP_START,
      lostHosp: 0,
      lostCold: 0,
      lostSmog: 0,
      nightLost: 0,
      fw: 10,
      burnouts: 0,
      burnT: 0,
      exhaustSec: 0,
      timkaShovels: 0,
      timkaCd: 0,
      leaks: [],
      leakTimer: 12,
      leakId: 1,
      leaksFixed: 0,
      leaksIgnored: 0,
      shovelCd: 0,
      danger: 0,
      venting: false,
      spills: 0,
      shovels: 0,
      flags: { timka: false, extend: false, brown: false, aid: false },
      choices: {},
      card: null,
      ending: null,
      summary: null,
      tut: opts.skipTutorial ? null : { step: 0, active: true, done: false, shovels: 0 },
      tickerIdx: 0,
      evShown: {},
      events: [],
      msgs: [],
      shake: 0,
      coalMade: 0,
      coalBurned: 0,
      nightStartCoal: 24,
      nightStartPop: POP_START,
      nightCoalMade: 0,
      hostOn: !!opts.host,
      xev: (
        /** @type {{id: string, d: number, m: number, t0: number, t1: number, label: string, shown: boolean}[]} */
        []
      )
    };
    return s2;
  }
  function emit(s2, type, data) {
    if (s2.events.length < 200)
      s2.events.push(__spreadValues({ type }, data));
  }
  function eventMult(s2, d) {
    const N = NIGHTS[s2.night];
    let m = 1;
    for (const e of N.events) {
      if (e.d !== d)
        continue;
      if (s2.t >= e.t0 && s2.t <= e.t1) {
        const ramp = Math.min(1, (s2.t - e.t0) / 2, (e.t1 - s2.t) / 2);
        m = Math.max(m, 1 + (e.m - 1) * Math.max(0, ramp));
      }
    }
    for (const e of s2.xev || []) {
      if (e.d === d && s2.t >= e.t0 && s2.t <= e.t1)
        m = Math.max(m, 1 + (e.m - 1) * Math.max(0, Math.min(1, (s2.t - e.t0) / 2, (e.t1 - s2.t) / 2)));
    }
    return m;
  }
  function needNow(s2, d) {
    const N = NIGHTS[s2.night];
    let n = N.need[d] * eventMult(s2, d);
    if (d === 0)
      n *= 1 + s2.smog / 300;
    return n;
  }
  var isNum = (v) => typeof v === "number" && Number.isFinite(v);
  var isValveIdx = (i) => Number.isInteger(i) && i >= 0 && i < 4;
  function setValve(s2, i, v) {
    if (isValveIdx(i) && isNum(v))
      s2.valves[i] = Math.max(0, Math.min(1, v));
  }
  function adjustValve(s2, i, dv) {
    if (isValveIdx(i) && isNum(dv))
      setValve(s2, i, Math.round((s2.valves[i] + dv) * 100) / 100);
  }
  function shovel(s2) {
    if (s2.phase !== "night")
      return false;
    if (s2.shovelCd > 0)
      return false;
    if (s2.coal < 1) {
      emit(s2, "nocoal", {});
      s2.shovelCd = 0.3;
      return false;
    }
    s2.coal -= 1;
    s2.coalBurned += 1;
    s2.shovelCd = SHOVEL_CD;
    s2.shovels++;
    if (s2.tut && s2.tut.active)
      s2.tut.shovels++;
    if (s2.fire > 85) {
      s2.fire = Math.min(100, s2.fire + 4);
      s2.spills++;
      s2.smog = Math.min(100, s2.smog + 1.5);
      emit(s2, "spill", {});
    } else {
      s2.fire = Math.min(100, s2.fire + SHOVEL_FIRE);
      emit(s2, "shovel", { good: s2.fire < 88 });
    }
    return true;
  }
  function fixLeak(s2, id) {
    if (id != null && !Number.isInteger(id))
      return false;
    const idx = id == null ? s2.leaks.length ? 0 : -1 : s2.leaks.findIndex((l2) => l2.id === id);
    if (idx < 0)
      return false;
    const l = s2.leaks.splice(idx, 1)[0];
    s2.leaksFixed++;
    emit(s2, "fix", { pipe: l.pipe, id: l.id });
    return true;
  }
  function spawnLeak(s2, pipe2) {
    if (s2.leaks.length >= 3)
      return;
    if (pipe2 == null)
      pipe2 = Math.floor(nextRand(s2) * 4);
    if (s2.leaks.some((l2) => l2.pipe === pipe2))
      return;
    const l = { id: s2.leakId++, pipe: pipe2, age: 0 };
    s2.leaks.push(l);
    emit(s2, "leak", { pipe: pipe2, id: l.id });
  }
  function chooseCard(s2, key) {
    if (s2.phase !== "card" || !s2.card)
      return;
    const c = s2.card;
    if (typeof key !== "string" || !c.options.some((o) => o.key === key))
      return;
    s2.choices[c.id] = key;
    if (c.id === "timka") {
      if (key === "help")
        s2.flags.timka = true;
      else
        s2.coal = Math.max(0, s2.coal - 6);
    } else if (c.id === "shift") {
      if (key === "extend")
        s2.flags.extend = true;
    } else if (c.id === "brown") {
      if (key === "accept") {
        s2.flags.brown = true;
        s2.coal = Math.min(COAL_MAX, s2.coal + 32);
      }
    } else if (c.id === "sloboda") {
      if (key === "aid") {
        s2.flags.aid = true;
        s2.coal = Math.max(0, s2.coal - 18);
      }
    }
    emit(s2, "choice", { id: c.id, key });
    s2.card = null;
    beginNight(s2, s2.night + 1);
  }
  function beginNight(s2, n) {
    s2.night = n;
    s2.t = 0;
    s2.phase = "night";
    s2.nightLost = 0;
    s2.tickerIdx = 0;
    s2.evShown = {};
    s2.smog *= 0.8;
    s2.fw *= 0.55;
    s2.burnT = 0;
    s2.leaks = [];
    s2.leakTimer = NIGHTS[n].leakEvery ? NIGHTS[n].leakEvery * 0.6 : 99;
    s2.danger = 0;
    s2.nightStartPop = s2.pop;
    s2.nightStartCoal = s2.coal;
    s2.nightCoalMade = s2.coalMade;
    s2.xev = s2.hostOn ? hostEvents(s2.seed, n) : [];
    emit(s2, "night", { n });
  }
  function continueSummary(s2) {
    if (s2.phase !== "summary")
      return;
    const c = CARDS[s2.night + 1];
    if (s2.night + 1 >= NIGHTS.length) {
      finish(s2, computeEnding(s2));
      return;
    }
    if (c) {
      s2.card = c;
      s2.phase = "card";
    } else
      beginNight(s2, s2.night + 1);
  }
  function toll(s2) {
    return s2.exhaustSec * 0.5 + s2.burnouts * 15 + s2.timkaShovels * 0.6 + (s2.flags.extend ? 8 : 0);
  }
  function smogAvg(s2) {
    return s2.smogTime > 0 ? s2.smogSum / s2.smogTime : 0;
  }
  function computeEnding(s2) {
    const pop = s2.pop / POP_START;
    if (pop < COLD_POP)
      return "cold";
    const tollR = toll(s2) / IRON_TOLL, smogR = smogAvg(s2) / SMOKE_AVG;
    if (tollR >= 1 || smogR >= 1)
      return tollR >= smogR ? "iron" : "smoke";
    return "light";
  }
  function finish(s2, id) {
    s2.ending = id;
    s2.phase = "ended";
    emit(s2, "ending", { id });
  }
  function step(s2, dt) {
    s2.clock += dt;
    if (s2.shake > 0)
      s2.shake = Math.max(0, s2.shake - dt * 2.2);
    if (s2.phase !== "night")
      return;
    const N = NIGHTS[s2.night];
    const tutorial = !!(s2.tut && s2.tut.active);
    const timerRuns = !tutorial;
    s2.shovelCd = Math.max(0, s2.shovelCd - dt);
    if (timerRuns)
      s2.t += dt;
    for (let i = 0; i < 4; i++)
      s2.needNow[i] = needNow(s2, i);
    for (let k = 0; k < N.events.length; k++) {
      const e = N.events[k];
      if (!s2.evShown[k] && s2.t >= e.t0) {
        s2.evShown[k] = true;
        emit(s2, "event", { label: e.label, d: e.d });
      }
    }
    for (const e of s2.xev || [])
      if (!e.shown && s2.t >= e.t0) {
        e.shown = true;
        emit(s2, "hostev", { id: e.id, d: e.d, m: e.m, label: e.label });
      }
    const tk = TICKER[s2.night];
    if (tk && s2.tickerIdx < tk.length && s2.t >= tk[s2.tickerIdx].t) {
      emit(s2, "talk", tk[s2.tickerIdx]);
      s2.tickerIdx++;
    }
    if (s2.flags.timka && s2.fire < 22 && s2.timkaCd <= 0 && s2.coal >= 1) {
      s2.coal -= 1;
      s2.coalBurned += 1;
      s2.fire += 13;
      s2.timkaShovels++;
      s2.timkaCd = 2;
      emit(s2, "timka", {});
    }
    s2.timkaCd = Math.max(0, s2.timkaCd - dt);
    for (const l of s2.leaks)
      l.age += dt;
    let leakLoss = 0;
    for (const l of s2.leaks)
      leakLoss += 1.6 + Math.min(l.age, 12) * 0.1;
    if (N.leakEvery && !tutorial) {
      s2.leakTimer -= dt;
      if (s2.leakTimer <= 0) {
        spawnLeak(s2);
        s2.leakTimer = N.leakEvery * randRange(s2, 0.75, 1.25);
      }
    }
    s2.fire = Math.max(0, s2.fire - s2.fire * FIRE_DECAY * dt);
    if (s2.fire < 0.05)
      s2.fire = 0;
    const gen = FIRE_COEF * s2.fire;
    const pf = Math.max(0, Math.min(1, s2.P / 30));
    s2.burnT = Math.max(0, s2.burnT - dt);
    let totalFlow = 0;
    for (let i = 0; i < 4; i++) {
      let open = s2.valves[i];
      if (i === 2 && s2.burnT > 0)
        open = 0;
      s2.flow[i] = open * CAP[i] * pf;
      totalFlow += s2.flow[i];
    }
    s2.venting = s2.P > P_VENT;
    const vent = s2.venting ? 2 + (s2.P - P_VENT) * 0.8 : 0;
    if (s2.venting && Math.floor(s2.clock * 6) !== Math.floor((s2.clock - dt) * 6))
      emit(s2, "vent", {});
    s2.P += (gen - totalFlow - leakLoss - vent - 0.012 * s2.P) / BOILER_CAP * dt;
    s2.P = Math.max(0, Math.min(100, s2.P));
    if (s2.P >= P_DANGER)
      s2.danger += dt;
    else
      s2.danger = Math.max(0, s2.danger - dt * 0.8);
    if (s2.danger >= 2.5) {
      s2.shake = 1;
      finish(s2, "boom");
      return;
    }
    for (let i = 0; i < 4; i++) {
      const tgt = Math.min(1, s2.flow[i] / s2.needNow[i]);
      s2.sat[i] += (tgt - s2.sat[i]) * Math.min(1, dt * 1.2);
    }
    const smogMul = s2.flags.brown ? 1.6 : 1;
    s2.smog += (s2.fire * 0.016 * smogMul - s2.flow[3] * 0.55 - 0.012 * s2.smog) * dt;
    s2.smog = Math.max(0, Math.min(100, s2.smog));
    if (timerRuns) {
      s2.smogSum += s2.smog * dt;
      s2.smogTime += dt;
    }
    const shiftM = s2.flags.extend ? 1.4 : 1;
    const ratio = s2.flow[2] / s2.needNow[2];
    if (s2.burnT > 0)
      s2.fw = Math.max(0, s2.fw - 1.2 * dt);
    else if (ratio < 0.15)
      s2.fw = Math.max(0, s2.fw - 2.2 * dt);
    else
      s2.fw = Math.min(100, s2.fw + (ratio * 1.4 * shiftM - 0.5) * dt);
    if (s2.fw >= 100) {
      s2.burnouts++;
      s2.burnT = 8;
      s2.fw = 65;
      s2.shake = Math.max(s2.shake, 0.5);
      emit(s2, "collapse", {});
    }
    if (s2.fw >= 75 && timerRuns)
      s2.exhaustSec += dt;
    const eff = 1 - 0.6 * Math.max(0, (s2.fw - 50) / 50);
    const made = s2.flow[2] * 0.08 * eff * (s2.flags.extend ? 1.35 : 1) * dt;
    s2.coal = Math.min(COAL_MAX, s2.coal + made);
    s2.coalMade += made;
    if (!tutorial) {
      let r0 = Math.max(0, 0.75 - s2.sat[0]) * 2.2;
      let r1 = Math.max(0, 0.6 - s2.sat[1]) * 2 * (s2.flags.aid ? 0.5 : 1);
      let r2 = Math.max(0, s2.smog - 65) * 0.03;
      s2.lostHosp += r0 * dt;
      s2.lostCold += r1 * dt;
      s2.lostSmog += r2 * dt;
      const lost = (r0 + r1 + r2) * dt;
      const before = Math.floor(s2.pop);
      s2.pop = Math.max(0, s2.pop - lost);
      s2.nightLost += lost;
      if (Math.floor(s2.pop) < before)
        emit(s2, "loss", { d: r0 >= r1 ? 0 : 1 });
      if (s2.pop / POP_START < SILENCE_POP) {
        finish(s2, "silence");
        return;
      }
    }
    if (tutorial)
      tutorialStep(s2);
    if (!tutorial && s2.t >= N.dur)
      endNight(s2);
  }
  function tutorialStep(s2) {
    const T = s2.tut, id = TUTORIAL[T.step].id;
    const mark = (d) => Math.min(1, s2.needNow[d] / CAP[d]);
    let ok = false;
    if (id === "shovel")
      ok = T.shovels >= 1;
    else if (id === "pressure")
      ok = s2.P >= 42;
    else if (id === "hosp")
      ok = s2.valves[0] >= mark(0) - 0.04 && s2.valves[0] <= mark(0) + 0.3;
    else if (id === "home")
      ok = s2.valves[1] >= mark(1) - 0.04 && s2.valves[1] <= mark(1) + 0.3;
    else if (id === "fact")
      ok = s2.valves[2] >= mark(2) - 0.04 && s2.valves[2] <= mark(2) + 0.3;
    else if (id === "scrub")
      ok = s2.valves[3] >= mark(3) - 0.04 && s2.valves[3] <= mark(3) + 0.3;
    else if (id === "leak") {
      if (!T.leakSpawned) {
        spawnLeak(s2, 1);
        T.leakSpawned = true;
      }
      ok = T.leakSpawned && s2.leaks.length === 0;
    }
    if (ok) {
      T.step++;
      T.at = s2.clock;
      emit(s2, "tutstep", { step: T.step });
      if (T.step >= TUTORIAL.length - 1) {
        T.active = false;
        T.done = true;
        s2.coal = Math.max(s2.coal, 22);
      }
    }
  }
  function endNight(s2) {
    const N = NIGHTS[s2.night];
    s2.summary = {
      night: s2.night,
      name: N.name,
      lost: Math.round(s2.nightLost),
      pop: Math.floor(s2.pop),
      coalDelta: Math.round(s2.coal - s2.nightStartCoal),
      smog: Math.round(s2.smog),
      fw: Math.round(s2.fw),
      burnouts: s2.burnouts,
      leaks: s2.leaksFixed
    };
    s2.phase = "summary";
    emit(s2, "nightend", {});
  }
  function serialize(s2) {
    const _a = s2, { events, msgs } = _a, rest = __objRest(_a, ["events", "msgs"]);
    return JSON.stringify(rest);
  }
  function deserialize(str) {
    const o = JSON.parse(str);
    o.events = [];
    o.msgs = [];
    return o;
  }

  // src/ui/layout.js
  var MIN_P = { w: 400, h: 860 };
  var MIN_L = { w: 1100, h: 700 };
  function viewFor(cssW, cssH) {
    const portrait = cssW / cssH < 0.95;
    const m = portrait ? MIN_P : MIN_L;
    const scale = Math.min(cssW / m.w, cssH / m.h);
    return { portrait, scale, W: cssW / scale, H: cssH / scale };
  }
  function makeLayout(fullW, H, portrait) {
    if (portrait) {
      const W2 = Math.min(fullW, 520), w = W2;
      const L3 = {
        portrait,
        W: W2,
        H,
        fullW,
        offX: (fullW - W2) / 2,
        hud: { x: 0, y: 0, w: W2, h: 46 },
        sky: { x: 0, y: 46, w: W2, h: 78 },
        gauge: { cx: 102, cy: 224, r: 84 },
        tank: { x: 200, y: 134, w: 190, h: 100 },
        furnace: { x: 200, y: 242, w: 190, h: 72 },
        coal: null,
        shovel: { x: 16, y: 648, w: w - 32, h: 64 },
        manifoldY: 338,
        modules: { x: 8, y: 372, w: w - 16, h: 268 },
        msg: { x: 12, y: 722, w: w - 24, h: Math.max(90, H - 722 - 8) },
        pause: { x: W2 - 42, y: 5, w: 36, h: 36 }
      };
      L3.trunkX = 188;
      L3.trunk = [[188, L3.tank.y + L3.tank.h * 0.55], [188, L3.manifoldY]];
      L3.tankLink = [[L3.tank.x, L3.tank.y + L3.tank.h * 0.55], [L3.gauge.cx + L3.gauge.r - 10, L3.tank.y + L3.tank.h * 0.55]];
      L3.chimney = { x: L3.tank.x + L3.tank.w * 0.75, y: L3.tank.y - 6 };
      return L3;
    }
    const mw = Math.min(fullW - 590, 800), W = 590 + mw;
    const L2 = {
      portrait,
      W,
      H,
      fullW,
      offX: (fullW - W) / 2,
      hud: { x: 0, y: 0, w: W, h: 52 },
      sky: { x: 0, y: 52, w: W, h: 88 },
      gauge: { cx: 190, cy: 300, r: 120 },
      tank: { x: 335, y: 190, w: 190, h: 232 },
      furnace: { x: 30, y: 458, w: 250, h: 210 },
      coal: { x: 290, y: 458, w: 100, h: 210 },
      shovel: { x: 400, y: 458, w: 125, h: 210 },
      manifoldY: 172,
      modules: { x: 570, y: 206, w: mw, h: 362 },
      msg: { x: 570, y: 580, w: mw, h: Math.max(100, H - 580 - 16) },
      pause: { x: W - 48, y: 8, w: 38, h: 38 }
    };
    L2.trunkX = L2.tank.x + L2.tank.w * 0.8;
    L2.trunk = [[L2.tank.x + L2.tank.w * 0.8, L2.tank.y], [L2.tank.x + L2.tank.w * 0.8, L2.manifoldY]];
    L2.tankLink = [[L2.tank.x, L2.tank.y + L2.tank.h * 0.5], [L2.gauge.cx + L2.gauge.r - 10, L2.tank.y + L2.tank.h * 0.5]];
    L2.chimney = { x: L2.tank.x + L2.tank.w * 0.3, y: L2.tank.y - 6 };
    return L2;
  }
  function column(L2, i) {
    const m = L2.modules, gap = L2.portrait ? 6 : 14;
    const cw = (m.w - gap * 3) / 4;
    const x = m.x + i * (cw + gap);
    const head = L2.portrait ? 42 : 52;
    const ty0 = m.y + head + 34, ty1 = m.y + m.h - (L2.portrait ? 62 : 72);
    return { x, y: m.y, w: cw, h: m.h, cx: x + cw / 2, head, ty0, ty1, leak: { x: x + cw / 2, y: L2.manifoldY + (m.y - L2.manifoldY) * 0.55 } };
  }

  // src/ui/draw.js
  var C = {
    bg0: "#14100d",
    bg1: "#1d1713",
    iron0: "#2a2119",
    iron1: "#3a2e25",
    iron2: "#4b3c30",
    brass0: "#7d5f21",
    brass1: "#c9a24a",
    brass2: "#f0d37e",
    copper0: "#6e371c",
    copper1: "#b8693a",
    copper2: "#e39a62",
    steam: "#e9f0ec",
    cream: "#f1e6c8",
    text: "#f3e7c9",
    dim: "#b7a98b",
    green: "#7fd079",
    yellow: "#f0c24a",
    red: "#e0523c",
    water: "#4fa6b8",
    coal: "#1a1512",
    flame0: "#ff5a1f",
    flame1: "#ffb13a",
    flame2: "#fff0a0",
    gold: "#ffd36b"
  };
  function rr(ctx2, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx2.beginPath();
    ctx2.moveTo(x + r, y);
    ctx2.arcTo(x + w, y, x + w, y + h, r);
    ctx2.arcTo(x + w, y + h, x, y + h, r);
    ctx2.arcTo(x, y + h, x, y, r);
    ctx2.arcTo(x, y, x + w, y, r);
    ctx2.closePath();
  }
  function brassGrad(ctx2, x0, y0, x1, y1) {
    const g = ctx2.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, C.brass2);
    g.addColorStop(0.35, C.brass1);
    g.addColorStop(0.7, C.brass0);
    g.addColorStop(1, C.brass1);
    return g;
  }
  function copperGrad(ctx2, x0, y0, x1, y1) {
    const g = ctx2.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, C.copper2);
    g.addColorStop(0.4, C.copper1);
    g.addColorStop(1, C.copper0);
    return g;
  }
  function rivet(ctx2, x, y, r = 2.6) {
    const g = ctx2.createRadialGradient(x - r * 0.4, y - r * 0.4, 0.2, x, y, r);
    g.addColorStop(0, "#f6e3a6");
    g.addColorStop(0.5, "#a98332");
    g.addColorStop(1, "#3d2c10");
    ctx2.fillStyle = g;
    ctx2.beginPath();
    ctx2.arc(x, y, r, 0, 6.2832);
    ctx2.fill();
  }
  function rivetsRect(ctx2, x, y, w, h, inset = 6, r = 2.4, step2 = 40) {
    const nx = Math.max(1, Math.round((w - inset * 2) / step2)), ny = Math.max(1, Math.round((h - inset * 2) / step2));
    for (let i = 0; i <= nx; i++) {
      const px = x + inset + (w - inset * 2) * i / nx;
      rivet(ctx2, px, y + inset, r);
      rivet(ctx2, px, y + h - inset, r);
    }
    for (let j = 1; j < ny; j++) {
      const py = y + inset + (h - inset * 2) * j / ny;
      rivet(ctx2, x + inset, py, r);
      rivet(ctx2, x + w - inset, py, r);
    }
  }
  function plate(ctx2, x, y, w, h, o = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const r = (_a = o.r) != null ? _a : 8;
    ctx2.save();
    rr(ctx2, x, y, w, h, r);
    const g = ctx2.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, (_b = o.top) != null ? _b : C.iron2);
    g.addColorStop(1, (_c = o.bot) != null ? _c : C.iron0);
    ctx2.fillStyle = g;
    ctx2.fill();
    ctx2.lineWidth = 2;
    ctx2.strokeStyle = (_d = o.edge) != null ? _d : "rgba(0,0,0,.6)";
    ctx2.stroke();
    rr(ctx2, x + 1.5, y + 1.5, w - 3, h - 3, r - 1);
    ctx2.lineWidth = 1;
    ctx2.strokeStyle = (_e = o.hi) != null ? _e : "rgba(255,230,170,.16)";
    ctx2.stroke();
    if (o.rivets !== false)
      rivetsRect(ctx2, x, y, w, h, (_f = o.inset) != null ? _f : 7, (_g = o.rr) != null ? _g : 2.2, (_h = o.step) != null ? _h : 46);
    ctx2.restore();
  }
  function gearPath(ctx2, r, teeth, depth = 0.16, hole = 0.28) {
    const n = teeth * 2;
    ctx2.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, rr0 = i % 2 ? r : r * (1 + depth);
      const aa = a0 + (a1 - a0) * 0.15, ab = a0 + (a1 - a0) * 0.85;
      const rin = i % 2 ? r : r * (1 + depth);
      ctx2.lineTo(Math.cos(aa) * rin, Math.sin(aa) * rin);
      ctx2.lineTo(Math.cos(ab) * rin, Math.sin(ab) * rin);
    }
    ctx2.closePath();
    ctx2.moveTo(r * hole, 0);
    ctx2.arc(0, 0, r * hole, 0, 6.2832, true);
  }
  var gearCache = /* @__PURE__ */ new Map();
  function gearSprite(r, teeth, kind = "iron", dpr2 = 1) {
    const key = `${Math.round(r)}|${teeth}|${kind}|${dpr2}`;
    let c = gearCache.get(key);
    if (c)
      return c;
    const size = Math.ceil(r * 2.5 * dpr2);
    c = document.createElement("canvas");
    c.width = c.height = size;
    const x = c.getContext("2d");
    x.scale(dpr2, dpr2);
    x.translate(size / 2 / dpr2, size / 2 / dpr2);
    const pal = { iron: ["#5a4a3b", "#2b211a", "#1a130e"], brass: ["#f0d37e", "#a98332", "#5a4012"], copper: ["#e39a62", "#a85a2c", "#4e2410"] }[kind];
    gearPath(x, r, teeth);
    const g = x.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.2);
    g.addColorStop(0, pal[0]);
    g.addColorStop(0.6, pal[1]);
    g.addColorStop(1, pal[2]);
    x.fillStyle = g;
    x.fill("evenodd");
    x.lineWidth = 1.5;
    x.strokeStyle = "rgba(0,0,0,.55)";
    x.stroke();
    x.strokeStyle = "rgba(0,0,0,.35)";
    x.lineWidth = Math.max(2, r * 0.07);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * 6.2832;
      x.beginPath();
      x.moveTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35);
      x.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82);
      x.stroke();
    }
    x.beginPath();
    x.arc(0, 0, r * 0.82, 0, 6.2832);
    x.lineWidth = 2;
    x.stroke();
    x.fillStyle = "rgba(255,240,200,.18)";
    x.beginPath();
    x.arc(-r * 0.2, -r * 0.25, r * 0.5, 3.6, 5.2);
    x.lineTo(0, 0);
    x.fill();
    gearCache.set(key, c);
    return c;
  }
  function drawGear(ctx2, x, y, r, teeth, rot, kind, alpha = 1, dpr2 = 1) {
    const spr = gearSprite(r, teeth, kind, dpr2), s2 = spr.width / dpr2;
    ctx2.save();
    ctx2.globalAlpha = alpha;
    ctx2.translate(x, y);
    ctx2.rotate(rot);
    ctx2.drawImage(spr, -s2 / 2, -s2 / 2, s2, s2);
    ctx2.restore();
  }
  function pipe(ctx2, pts, w = 12, kind = "copper") {
    ctx2.save();
    ctx2.lineCap = "round";
    ctx2.lineJoin = "round";
    const path = () => {
      ctx2.beginPath();
      ctx2.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++)
        ctx2.lineTo(pts[i][0], pts[i][1]);
    };
    const cols = kind === "copper" ? ["#2a130a", C.copper0, C.copper1, C.copper2] : ["#1a1208", C.brass0, C.brass1, C.brass2];
    path();
    ctx2.strokeStyle = cols[0];
    ctx2.lineWidth = w + 4;
    ctx2.stroke();
    path();
    ctx2.strokeStyle = cols[1];
    ctx2.lineWidth = w;
    ctx2.stroke();
    path();
    ctx2.strokeStyle = cols[2];
    ctx2.lineWidth = w * 0.62;
    ctx2.stroke();
    path();
    ctx2.strokeStyle = cols[3];
    ctx2.lineWidth = w * 0.18;
    ctx2.globalAlpha = 0.7;
    ctx2.translate(-w * 0.12, -w * 0.12);
    ctx2.stroke();
    ctx2.restore();
  }
  function flange(ctx2, x, y, w = 18, h = 7) {
    ctx2.save();
    rr(ctx2, x - w / 2, y - h / 2, w, h, 2);
    ctx2.fillStyle = brassGrad(ctx2, x - w / 2, y, x + w / 2, y);
    ctx2.fill();
    ctx2.strokeStyle = "rgba(0,0,0,.6)";
    ctx2.lineWidth = 1;
    ctx2.stroke();
    ctx2.restore();
  }
  function flowDots(ctx2, x0, y0, x1, y1, t, amount, col = "rgba(240,246,242,0.85)") {
    if (amount <= 0.02)
      return;
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / 14));
    ctx2.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const f = (i / n + t * (0.4 + amount * 0.9)) % 1;
      ctx2.globalAlpha = Math.min(1, amount * 1.2) * 0.8;
      ctx2.beginPath();
      ctx2.arc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, 1.6 + amount * 1.6, 0, 6.2832);
      ctx2.fill();
    }
    ctx2.globalAlpha = 1;
  }
  function glassShine(ctx2, x, y, w, h, r = 6) {
    ctx2.save();
    rr(ctx2, x, y, w, h, r);
    ctx2.clip();
    const g = ctx2.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "rgba(255,255,255,.22)");
    g.addColorStop(0.35, "rgba(255,255,255,.04)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx2.fillStyle = g;
    ctx2.fillRect(x, y, w, h);
    ctx2.restore();
  }
  function icon(ctx2, name, x, y, s2, col = C.cream) {
    ctx2.save();
    ctx2.translate(x, y);
    ctx2.fillStyle = col;
    ctx2.strokeStyle = col;
    ctx2.lineWidth = Math.max(1.5, s2 * 0.1);
    ctx2.lineJoin = "round";
    ctx2.lineCap = "round";
    const h = s2 / 2;
    if (name === "cross") {
      const t = s2 * 0.26;
      ctx2.fillRect(-t / 2, -h, t, s2);
      ctx2.fillRect(-h, -t / 2, s2, t);
    } else if (name === "house") {
      ctx2.beginPath();
      ctx2.moveTo(-h, 0);
      ctx2.lineTo(0, -h);
      ctx2.lineTo(h, 0);
      ctx2.closePath();
      ctx2.fill();
      ctx2.fillRect(-h * 0.7, 0, s2 * 0.7, h);
      ctx2.fillStyle = "#2a2119";
      ctx2.fillRect(-h * 0.2, h * 0.15, h * 0.4, h * 0.85);
    } else if (name === "factory") {
      ctx2.beginPath();
      ctx2.moveTo(-h, h);
      ctx2.lineTo(-h, -h * 0.1);
      ctx2.lineTo(-h * 0.3, h * 0.25);
      ctx2.lineTo(-h * 0.3, -h * 0.1);
      ctx2.lineTo(h * 0.3, h * 0.25);
      ctx2.lineTo(h * 0.3, -h * 0.1);
      ctx2.lineTo(h, h * 0.25);
      ctx2.lineTo(h, h);
      ctx2.closePath();
      ctx2.fill();
      ctx2.fillRect(h * 0.35, -h, h * 0.4, h * 1.1);
    } else if (name === "filter") {
      ctx2.beginPath();
      ctx2.arc(0, h * 0.2, h * 0.75, 0, 6.2832);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(-h * 0.5, h * 0.2);
      ctx2.lineTo(h * 0.5, h * 0.2);
      ctx2.moveTo(-h * 0.35, -h * 0.15);
      ctx2.lineTo(h * 0.35, -h * 0.15);
      ctx2.moveTo(-h * 0.35, h * 0.55);
      ctx2.lineTo(h * 0.35, h * 0.55);
      ctx2.stroke();
    } else if (name === "person") {
      ctx2.beginPath();
      ctx2.arc(0, -h * 0.5, h * 0.38, 0, 6.2832);
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(0, h * 0.95, h * 0.85, Math.PI, 0);
      ctx2.fill();
    } else if (name === "coal") {
      ctx2.beginPath();
      ctx2.moveTo(-h, h * 0.6);
      ctx2.lineTo(-h * 0.6, -h * 0.3);
      ctx2.lineTo(0, -h * 0.9);
      ctx2.lineTo(h * 0.7, -h * 0.2);
      ctx2.lineTo(h, h * 0.6);
      ctx2.closePath();
      ctx2.fill();
      ctx2.strokeStyle = "rgba(255,255,255,.35)";
      ctx2.beginPath();
      ctx2.moveTo(-h * 0.2, -h * 0.5);
      ctx2.lineTo(0, 0);
      ctx2.lineTo(h * 0.4, -h * 0.1);
      ctx2.stroke();
    } else if (name === "pause") {
      ctx2.fillRect(-h * 0.55, -h * 0.7, h * 0.4, s2 * 0.7);
      ctx2.fillRect(h * 0.15, -h * 0.7, h * 0.4, s2 * 0.7);
    } else if (name === "shovel") {
      ctx2.beginPath();
      ctx2.moveTo(-h * 0.2, -h);
      ctx2.lineTo(h * 0.2, h * 0.1);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(-h * 0.1, h * 0.05);
      ctx2.lineTo(h * 0.7, h * 0.2);
      ctx2.lineTo(h * 0.45, h * 0.95);
      ctx2.lineTo(-h * 0.5, h * 0.7);
      ctx2.closePath();
      ctx2.fill();
    } else if (name === "drop") {
      ctx2.beginPath();
      ctx2.moveTo(0, -h);
      ctx2.quadraticCurveTo(h, h * 0.3, 0, h);
      ctx2.quadraticCurveTo(-h, h * 0.3, 0, -h);
      ctx2.fill();
    }
    ctx2.restore();
  }
  function text(ctx2, str, x, y, size, col = C.text, align = "left", weight = "bold", stroke = true) {
    ctx2.font = `${weight} ${size}px Georgia, "Times New Roman", serif`;
    ctx2.textAlign = align;
    ctx2.textBaseline = "middle";
    if (stroke) {
      ctx2.lineWidth = 3;
      ctx2.strokeStyle = "rgba(0,0,0,.65)";
      ctx2.lineJoin = "round";
      ctx2.strokeText(str, x, y);
    }
    ctx2.fillStyle = col;
    ctx2.fillText(str, x, y);
  }
  function sans(ctx2, str, x, y, size, col = C.text, align = "left", weight = "600") {
    ctx2.font = `${weight} ${size}px system-ui, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx2.textAlign = align;
    ctx2.textBaseline = "middle";
    ctx2.fillStyle = col;
    ctx2.fillText(str, x, y);
  }
  function wrap(ctx2, str, maxW) {
    const words = str.split(" "), lines = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (ctx2.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else
        cur = t;
    }
    if (cur)
      lines.push(cur);
    return lines;
  }

  // src/ui/render.js
  var TAU = Math.PI * 2;
  var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function makeBackground(W, H, dpr2, scale) {
    const c = document.createElement("canvas");
    c.width = Math.ceil(W * scale * dpr2);
    c.height = Math.ceil(H * scale * dpr2);
    const x = c.getContext("2d");
    x.scale(scale * dpr2, scale * dpr2);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1b1511");
    g.addColorStop(1, "#0f0b09");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    const rnd2 = makeRng(5);
    const bw = 90, bh = 46;
    for (let j = 0; j * bh < H + bh; j++)
      for (let i = -1; i * bw < W + bw; i++) {
        const ox = j % 2 * bw / 2, px = i * bw + ox, py = j * bh;
        const v = rnd2() * 10;
        x.fillStyle = `rgb(${34 + v},${27 + v * 0.8},${22 + v * 0.6})`;
        x.fillRect(px + 1, py + 1, bw - 2, bh - 2);
        x.fillStyle = "rgba(255,230,180,.035)";
        x.fillRect(px + 1, py + 1, bw - 2, 2);
        x.fillStyle = "rgba(0,0,0,.25)";
        x.fillRect(px + 1, py + bh - 3, bw - 2, 2);
      }
    const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,.65)");
    x.fillStyle = vg;
    x.fillRect(0, 0, W, H);
    return c;
  }
  function makeCity(width, h, seed = 11) {
    const rnd2 = makeRng(seed);
    const blds = [];
    let x = -10;
    const hospAt = width * 0.16, factAt = width * 0.84;
    while (x < width + 10) {
      const w = 26 + rnd2() * 34, special = x < hospAt && x + w > hospAt ? "hosp" : x < factAt && x + w > factAt ? "fact" : null;
      const bh = special ? h * 0.8 : 20 + rnd2() * (h - 34);
      const b = { x, w, h: bh, special, wins: [], roof: rnd2() < 0.5 ? 1 : 0 };
      const cols = Math.max(1, Math.floor((w - 8) / 9)), rows = Math.max(1, Math.floor((bh - 8) / 11));
      const d = special === "hosp" ? 0 : special === "fact" ? 2 : 1;
      for (let r = 0; r < rows; r++)
        for (let q = 0; q < cols; q++)
          b.wins.push({ x: 5 + q * 9 + (w - 8 - cols * 9) / 2 + 2, y: 6 + r * 11, rank: rnd2(), d });
      blds.push(b);
      x += w + 2 + rnd2() * 4;
    }
    return { blds, hospAt, factAt, width, h };
  }
  function drawCity(ctx2, R) {
    const { s: s2, L: L2, vis: vis2, city: city2 } = R;
    const y0 = L2.sky.y, h = L2.sky.h, w = L2.fullW;
    ctx2.save();
    ctx2.translate(-L2.offX, 0);
    ctx2.beginPath();
    ctx2.rect(0, y0, w, h);
    ctx2.clip();
    const smog = s2.smog / 100;
    const g = ctx2.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, mix([14, 24, 34], [44, 36, 28], smog));
    g.addColorStop(1, mix([52, 66, 74], [92, 76, 56], smog));
    ctx2.fillStyle = g;
    ctx2.fillRect(0, y0, w, h);
    if (!R.reduced) {
      ctx2.fillStyle = "rgba(255,245,220,.5)";
      const rn = makeRng(3);
      for (let i = 0; i < 26; i++) {
        const sx = rn() * w, sy = y0 + rn() * h * 0.5;
        if (rn() < 1 - smog)
          ctx2.fillRect(sx, sy, 1.4, 1.4);
      }
    }
    const base = y0 + h;
    const popF = vis2.popShown / POP_START;
    for (const b of city2.blds) {
      const bx = b.x, by = base - b.h;
      ctx2.fillStyle = b.special === "hosp" ? "#2d2a2c" : "#1d1814";
      ctx2.fillRect(bx, by, b.w, b.h);
      ctx2.fillStyle = "rgba(255,230,180,.06)";
      ctx2.fillRect(bx, by, b.w, 2);
      if (b.roof) {
        ctx2.beginPath();
        ctx2.moveTo(bx - 1, by);
        ctx2.lineTo(bx + b.w / 2, by - 7);
        ctx2.lineTo(bx + b.w + 1, by);
        ctx2.fill();
      }
      for (const wn of b.wins) {
        const lit = clamp((popF - wn.rank) * 18, 0, 1);
        const sat = vis2.satShown[wn.d];
        const a = lit * (0.25 + 0.75 * sat);
        if (a < 0.03) {
          ctx2.fillStyle = "#0d0a08";
          ctx2.fillRect(bx + wn.x, by + wn.y, 5, 6);
          continue;
        }
        ctx2.fillStyle = wn.d === 0 ? `rgba(220,245,230,${0.2 + a * 0.8})` : `rgba(255,${190 + sat * 30 | 0},${100 + sat * 30 | 0},${0.2 + a * 0.8})`;
        ctx2.fillRect(bx + wn.x, by + wn.y, 5, 6);
      }
      if (b.special === "hosp") {
        const cx = bx + b.w / 2, cy = by + 8;
        const aa = 0.35 + 0.65 * vis2.satShown[0];
        ctx2.fillStyle = `rgba(230,70,60,${aa})`;
        ctx2.fillRect(cx - 2, cy - 6, 4, 12);
        ctx2.fillRect(cx - 6, cy - 2, 12, 4);
      }
      if (b.special === "fact") {
        ctx2.fillStyle = "#17120f";
        ctx2.fillRect(bx + b.w - 12, by - 14, 7, 16);
        ctx2.fillRect(bx + 4, by - 9, 6, 11);
      }
    }
    if (!R.reduced) {
      ctx2.fillStyle = "rgba(240,245,250,.55)";
      for (const f of vis2.snow)
        ctx2.fillRect(f.x % w, y0 + f.y, f.s, f.s);
    }
    ctx2.fillStyle = `rgba(70,60,50,${smog * 0.45})`;
    ctx2.fillRect(0, y0, w, h);
    ctx2.restore();
    ctx2.fillStyle = brassGrad(ctx2, 0, y0 + h, 0, y0 + h + 6);
    ctx2.fillRect(-L2.offX, y0 + h, w, 5);
    ctx2.fillStyle = "rgba(0,0,0,.5)";
    ctx2.fillRect(-L2.offX, y0 + h + 5, w, 2);
    ctx2.fillStyle = "rgba(0,0,0,.35)";
    ctx2.fillRect(-L2.offX, y0 - 2, w, 2);
  }
  function mix(a, b, t) {
    return `rgb(${a[0] + (b[0] - a[0]) * t | 0},${a[1] + (b[1] - a[1]) * t | 0},${a[2] + (b[2] - a[2]) * t | 0})`;
  }
  function drawHUD(ctx2, R) {
    const { s: s2, L: L2, vis: vis2 } = R;
    const h = L2.hud;
    ctx2.fillStyle = "#17110d";
    ctx2.fillRect(-L2.offX, 0, L2.fullW, h.h);
    ctx2.fillStyle = brassGrad(ctx2, 0, h.h - 4, 0, h.h);
    ctx2.fillRect(-L2.offX, h.h - 3, L2.fullW, 3);
    const N = NIGHTS[s2.night] || NIGHTS[NIGHTS.length - 1];
    const tN = s2.tut && s2.tut.active ? 0 : s2.t / N.dur;
    const portrait = L2.portrait, fs = portrait ? 13 : 17;
    const nightLabel = portrait ? `\u041D\u043E\u0447\u044C ${s2.night + 1}/10` : `\u041D\u043E\u0447\u044C ${s2.night + 1} \u0438\u0437 10 \xB7 ${N.name}`;
    text(ctx2, nightLabel, 12, h.h / 2 - 1, fs, C.cream);
    const px = portrait ? 12 : 12, pw = portrait ? 120 : 220;
    if (!portrait) {
    }
    const barY = h.h - 9;
    rr(ctx2, px, barY, portrait ? 130 : 260, 5, 2.5);
    ctx2.fillStyle = "rgba(0,0,0,.55)";
    ctx2.fill();
    if (!(s2.tut && s2.tut.active)) {
      rr(ctx2, px, barY, Math.max(4, (portrait ? 130 : 260) * clamp(tN, 0, 1)), 5, 2.5);
      ctx2.fillStyle = C.brass1;
      ctx2.fill();
    }
    const pr = L2.pause.x - 8;
    const popStr = String(Math.round(vis2.popShown));
    const popCol = vis2.popShown / POP_START > 0.9 ? C.cream : vis2.popShown / POP_START > 0.8 ? C.yellow : C.red;
    const coalCol = s2.coal < 6 ? C.red : s2.coal < 14 ? C.yellow : C.cream;
    if (portrait) {
      icon(ctx2, "coal", pr - 128, h.h / 2, 14, coalCol);
      text(ctx2, String(Math.floor(s2.coal)), pr - 118, h.h / 2, 14, coalCol, "left");
      icon(ctx2, "person", pr - 66, h.h / 2, 14, popCol);
      text(ctx2, popStr, pr - 56, h.h / 2, 14, popCol, "left");
    } else {
      sans(ctx2, "\u0423\u0413\u041E\u041B\u042C", pr - 270, h.h / 2 - 8, 11, C.dim, "left", "700");
      icon(ctx2, "coal", pr - 266, h.h / 2 + 9, 14, coalCol);
      text(ctx2, String(Math.floor(s2.coal)), pr - 252, h.h / 2 + 9, 17, coalCol, "left");
      sans(ctx2, "\u0416\u0418\u0422\u0415\u041B\u0418", pr - 150, h.h / 2 - 8, 11, C.dim, "left", "700");
      icon(ctx2, "person", pr - 146, h.h / 2 + 9, 14, popCol);
      text(ctx2, popStr, pr - 132, h.h / 2 + 9, 17, popCol, "left");
      if (R.reduced === false) {
      }
    }
    const pb = L2.pause;
    plate(ctx2, pb.x, pb.y, pb.w, pb.h, { r: 6, rivets: false, top: "#5a4a3b", bot: "#2b211a" });
    icon(ctx2, "pause", pb.x + pb.w / 2, pb.y + pb.h / 2, 16, C.cream);
  }
  function gaugeLabels(r) {
    const out = [], a0 = 0.75 * Math.PI, sw = 1.5 * Math.PI, rb = r - 22;
    const r1 = rb - r * 0.07, r2 = r1 - r * 0.12, rn = r2 - r * 0.1, fs = Math.max(9, Math.round(r * 0.13));
    for (let v = 0; v <= 100; v += 20) {
      const a = a0 + v / 100 * sw;
      out.push({ t: String(v), x: Math.cos(a) * rn, y: Math.sin(a) * rn, font: `bold ${fs}px Georgia, serif`, col: "#2a2119", kind: "tick" });
    }
    out.push({ t: "\u0414\u0410\u0412\u041B\u0415\u041D\u0418\u0415", x: 0, y: r * 0.55, font: `bold ${Math.max(9, Math.round(r * 0.12))}px Georgia, serif`, col: "#4a3a2a", kind: "word" });
    out.push({ t: "\u0430\u0442\u043C", x: 0, y: r * 0.55 + Math.max(9, Math.round(r * 0.12)) + 4, font: `${Math.max(9, Math.round(r * 0.1))}px Georgia, serif`, col: "#4a3a2a", kind: "word" });
    return out;
  }
  function drawGauge(ctx2, R) {
    const { s: s2, L: L2, vis: vis2 } = R;
    const g = L2.gauge, r = g.r;
    ctx2.save();
    ctx2.translate(g.cx, g.cy);
    ctx2.fillStyle = "rgba(0,0,0,.45)";
    ctx2.beginPath();
    ctx2.arc(3, 6, r + 4, 0, TAU);
    ctx2.fill();
    ctx2.fillStyle = brassGrad(ctx2, -r, -r, r, r);
    ctx2.beginPath();
    ctx2.arc(0, 0, r + 4, 0, TAU);
    ctx2.fill();
    ctx2.strokeStyle = "rgba(0,0,0,.6)";
    ctx2.lineWidth = 2;
    ctx2.stroke();
    ctx2.fillStyle = "rgba(0,0,0,.55)";
    ctx2.beginPath();
    ctx2.arc(0, 0, r - 8, 0, TAU);
    ctx2.fill();
    const fg = ctx2.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    fg.addColorStop(0, "#fff3d0");
    fg.addColorStop(0.7, "#e4d3a4");
    fg.addColorStop(1, "#bba978");
    ctx2.fillStyle = fg;
    ctx2.beginPath();
    ctx2.arc(0, 0, r - 11, 0, TAU);
    ctx2.fill();
    const a0 = 0.75 * Math.PI, sw = 1.5 * Math.PI, ang = (v) => a0 + clamp(v, 0, 100) / 100 * sw;
    const rb = r - 22;
    const band = (v0, v1, col) => {
      ctx2.beginPath();
      ctx2.arc(0, 0, rb, ang(v0), ang(v1));
      ctx2.strokeStyle = col;
      ctx2.lineWidth = r * 0.11;
      ctx2.lineCap = "butt";
      ctx2.stroke();
    };
    band(0, P_GREEN[0], "#9d8f6a");
    band(P_GREEN[0], P_GREEN[1], "#4d9a4a");
    band(P_GREEN[1], P_VENT, "#d9a62c");
    band(P_VENT, 100, "#c4402c");
    ctx2.strokeStyle = "#2a2119";
    ctx2.fillStyle = "#2a2119";
    for (let v = 0; v <= 100; v += 5) {
      const a2 = ang(v), big = v % 20 === 0, r1 = rb - r * 0.07, r2 = r1 - (big ? r * 0.12 : r * 0.06);
      ctx2.lineWidth = big ? 2.2 : 1;
      ctx2.beginPath();
      ctx2.moveTo(Math.cos(a2) * r1, Math.sin(a2) * r1);
      ctx2.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
      ctx2.stroke();
    }
    const a = ang(vis2.needle);
    ctx2.save();
    ctx2.rotate(a);
    ctx2.shadowColor = "rgba(0,0,0,.4)";
    ctx2.shadowBlur = 4;
    ctx2.shadowOffsetY = 3;
    ctx2.fillStyle = "#7a1f12";
    ctx2.beginPath();
    ctx2.moveTo(-r * 0.2, -3);
    ctx2.lineTo(rb - 2, -1.2);
    ctx2.lineTo(rb + 4, 0);
    ctx2.lineTo(rb - 2, 1.2);
    ctx2.lineTo(-r * 0.2, 3);
    ctx2.closePath();
    ctx2.fill();
    ctx2.restore();
    ctx2.fillStyle = brassGrad(ctx2, -8, -8, 8, 8);
    ctx2.beginPath();
    ctx2.arc(0, 0, r * 0.1, 0, TAU);
    ctx2.fill();
    ctx2.strokeStyle = "#000";
    ctx2.lineWidth = 1;
    ctx2.stroke();
    for (const lb of gaugeLabels(r)) {
      ctx2.font = lb.font;
      ctx2.textAlign = "center";
      ctx2.textBaseline = "middle";
      ctx2.fillStyle = lb.col;
      ctx2.fillText(lb.t, lb.x, lb.y);
    }
    glassShine(ctx2, -r + 12, -r + 12, r * 2 - 24, r - 10, r * 0.6);
    if (s2.danger > 0) {
      ctx2.beginPath();
      ctx2.arc(0, 0, r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(s2.danger / 2.5, 0, 1));
      ctx2.strokeStyle = C.red;
      ctx2.lineWidth = 6;
      ctx2.stroke();
    }
    ctx2.restore();
    const lab = s2.P > P_VENT ? "\u041F\u0420\u0415\u0414\u041E\u0425\u0420\u0410\u041D\u0418\u0422\u0415\u041B\u042C \u0421\u0420\u0410\u0411\u041E\u0422\u0410\u041B" : s2.P < P_GREEN[0] ? "\u041C\u0430\u043B\u043E \u043F\u0430\u0440\u0430" : s2.P > P_GREEN[1] ? "\u0412\u044B\u0441\u043E\u043A\u043E\u0435" : "\u0412 \u043D\u043E\u0440\u043C\u0435";
    const lc = s2.P > P_VENT ? C.red : s2.P < P_GREEN[0] ? C.yellow : s2.P > P_GREEN[1] ? C.yellow : C.green;
    const ly = g.cy + r + (L2.portrait ? 14 : 18);
    text(ctx2, lab, g.cx, ly, L2.portrait ? 12 : 14, lc, "center");
  }
  function drawBoiler(ctx2, R) {
    const { s: s2, L: L2, vis: vis2, time: time2 } = R;
    const t = L2.tank;
    pipe(ctx2, L2.tankLink, L2.portrait ? 8 : 10, "brass");
    const tr = L2.trunk;
    pipe(ctx2, tr, L2.portrait ? 12 : 14, "copper");
    const tw = L2.portrait ? 12 : 14;
    ctx2.save();
    ctx2.fillStyle = "rgba(0,0,0,.5)";
    rr(ctx2, t.x + 4, t.y + 6, t.w, t.h, 18);
    ctx2.fill();
    rr(ctx2, t.x, t.y, t.w, t.h, 18);
    const g = ctx2.createLinearGradient(t.x, 0, t.x + t.w, 0);
    g.addColorStop(0, C.copper0);
    g.addColorStop(0.18, C.copper2);
    g.addColorStop(0.45, C.copper1);
    g.addColorStop(1, "#3d1c0c");
    ctx2.fillStyle = g;
    ctx2.fill();
    ctx2.lineWidth = 2;
    ctx2.strokeStyle = "rgba(0,0,0,.7)";
    ctx2.stroke();
    ctx2.save();
    rr(ctx2, t.x, t.y, t.w, t.h, 18);
    ctx2.clip();
    const bands = L2.portrait ? [0.3, 0.72] : [0.22, 0.5, 0.78];
    for (const b of bands) {
      const by = t.y + t.h * b;
      ctx2.fillStyle = brassGrad(ctx2, t.x, by, t.x + t.w, by);
      ctx2.fillRect(t.x, by - 4, t.w, 8);
      ctx2.fillStyle = "rgba(0,0,0,.45)";
      ctx2.fillRect(t.x, by + 4, t.w, 2);
      for (let i = 0; i < 6; i++)
        rivet(ctx2, t.x + 14 + i * (t.w - 28) / 5, by, 2.3);
    }
    const glow = clamp(s2.P / 100, 0, 1);
    const gr = ctx2.createRadialGradient(t.x + t.w / 2, t.y + t.h * 0.6, 4, t.x + t.w / 2, t.y + t.h * 0.6, t.w * 0.8);
    gr.addColorStop(0, `rgba(255,170,80,${0.05 + glow * 0.22})`);
    gr.addColorStop(1, "rgba(255,170,80,0)");
    ctx2.fillStyle = gr;
    ctx2.fillRect(t.x, t.y, t.w, t.h);
    ctx2.restore();
    const wx = t.x + t.w * 0.5 - (L2.portrait ? 26 : 30), wy = t.y + t.h * (L2.portrait ? 0.34 : 0.28), ww = L2.portrait ? 52 : 60, wh = L2.portrait ? 34 : 58;
    rr(ctx2, wx - 5, wy - 5, ww + 10, wh + 10, 8);
    ctx2.fillStyle = brassGrad(ctx2, wx, wy, wx + ww, wy + wh);
    ctx2.fill();
    rr(ctx2, wx, wy, ww, wh, 5);
    ctx2.fillStyle = "#10222a";
    ctx2.fill();
    ctx2.save();
    rr(ctx2, wx, wy, ww, wh, 5);
    ctx2.clip();
    const lvl = 0.5 + 0.1 * Math.sin(time2 * 1.3) + glow * 0.1;
    ctx2.fillStyle = "rgba(79,166,184,.75)";
    ctx2.fillRect(wx, wy + wh * (1 - lvl), ww, wh * lvl);
    if (!R.reduced) {
      ctx2.fillStyle = "rgba(220,245,250,.6)";
      for (let i = 0; i < 6; i++) {
        const f = (time2 * (0.3 + s2.fire / 90) + i * 0.17) % 1;
        ctx2.beginPath();
        ctx2.arc(wx + 6 + i * 37 % (ww - 12), wy + wh - f * wh * lvl, 1.6 + i % 2, 0, TAU);
        ctx2.fill();
      }
    }
    ctx2.restore();
    glassShine(ctx2, wx, wy, ww, wh, 5);
    const vx = t.x + t.w * 0.72, vy = t.y - 2;
    ctx2.fillStyle = brassGrad(ctx2, vx - 8, vy, vx + 8, vy);
    ctx2.fillRect(vx - 6, vy - 12, 12, 14);
    ctx2.fillRect(vx - 10, vy - 16, 20, 6);
    ctx2.restore();
    if (s2.venting)
      R.fx.steam(vx, vy - 18, 1.2, { vy: -90, vx: 10, jx: 24, r: 6, grow: 40, life: 0.9, a: 0.55 });
    const ch = L2.chimney;
    ctx2.fillStyle = "#241c16";
    ctx2.fillRect(ch.x - 9, ch.y - 22, 18, 24);
    ctx2.fillStyle = brassGrad(ctx2, ch.x - 12, 0, ch.x + 12, 0);
    ctx2.fillRect(ch.x - 12, ch.y - 26, 24, 6);
  }
  function flame(ctx2, x, y, w, h, t, k, seed) {
    const n = 5;
    for (let layer = 0; layer < 3; layer++) {
      const cols = [C.flame0, C.flame1, C.flame2], sc = [1, 0.7, 0.4][layer];
      ctx2.fillStyle = cols[layer];
      ctx2.globalAlpha = 0.9;
      for (let i = 0; i < n; i++) {
        const fx2 = x + w * (i + 0.5) / n, ph = t * (4 + i) + seed + i * 1.7;
        const hh = h * k * sc * (0.65 + 0.35 * Math.sin(ph) * Math.cos(ph * 0.7 + i));
        const ww = w / n * (0.85 - layer * 0.15);
        ctx2.beginPath();
        ctx2.moveTo(fx2 - ww / 2, y);
        ctx2.quadraticCurveTo(fx2 - ww * 0.45 + Math.sin(ph) * 3, y - hh * 0.55, fx2 + Math.sin(ph * 1.3) * 4, y - hh);
        ctx2.quadraticCurveTo(fx2 + ww * 0.45 + Math.sin(ph) * 3, y - hh * 0.55, fx2 + ww / 2, y);
        ctx2.closePath();
        ctx2.fill();
      }
    }
    ctx2.globalAlpha = 1;
  }
  function drawFurnace(ctx2, R) {
    const { s: s2, L: L2, vis: vis2, time: time2 } = R;
    const f = L2.furnace;
    plate(ctx2, f.x, f.y, f.w, f.h, { r: 10 });
    const dx = f.x + 14, dy = f.y + (L2.portrait ? 12 : 22), dw = f.w - 28, dh = f.h - (L2.portrait ? 24 : 70);
    rr(ctx2, dx - 4, dy - 4, dw + 8, dh + 8, 10);
    ctx2.fillStyle = brassGrad(ctx2, dx, dy, dx + dw, dy + dh);
    ctx2.fill();
    rr(ctx2, dx, dy, dw, dh, 7);
    ctx2.fillStyle = "#0a0605";
    ctx2.fill();
    const k = clamp(vis2.fireShown / 100, 0, 1);
    ctx2.save();
    rr(ctx2, dx, dy, dw, dh, 7);
    ctx2.clip();
    const gl = ctx2.createRadialGradient(dx + dw / 2, dy + dh, 4, dx + dw / 2, dy + dh, dw * 0.8);
    gl.addColorStop(0, `rgba(255,150,40,${0.15 + k * 0.7})`);
    gl.addColorStop(1, "rgba(255,90,20,0)");
    ctx2.fillStyle = gl;
    ctx2.fillRect(dx, dy, dw, dh);
    ctx2.fillStyle = "#15100d";
    ctx2.beginPath();
    ctx2.moveTo(dx, dy + dh);
    for (let i = 0; i <= 12; i++)
      ctx2.lineTo(dx + dw * i / 12, dy + dh - 5 - i * 7 % 5);
    ctx2.lineTo(dx + dw, dy + dh);
    ctx2.fill();
    if (k > 0.02)
      flame(ctx2, dx + 4, dy + dh - 3, dw - 8, dh * 0.95, R.reduced ? time2 * 0.5 : time2, Math.min(1, 0.15 + k * 0.9), 1.3);
    ctx2.fillStyle = `rgba(255,${80 + k * 100 | 0},20,${0.3 + k * 0.5})`;
    for (let i = 0; i < 7; i++)
      ctx2.fillRect(dx + 6 + i * (dw - 12) / 7, dy + dh - 6, 8, 3);
    ctx2.restore();
    rr(ctx2, dx, dy, dw, dh, 7);
    ctx2.lineWidth = 2;
    ctx2.strokeStyle = "rgba(0,0,0,.7)";
    ctx2.stroke();
    const by = f.y + f.h - (L2.portrait ? 0 : 38);
    if (!L2.portrait) {
      const bx = f.x + 18, bw = f.w - 36;
      sans(ctx2, "\u0416\u0410\u0420 \u0422\u041E\u041F\u041A\u0418", bx, by + 6, 11, C.dim, "left", "700");
      rr(ctx2, bx, by + 16, bw, 10, 5);
      ctx2.fillStyle = "rgba(0,0,0,.6)";
      ctx2.fill();
      ctx2.save();
      rr(ctx2, bx, by + 16, bw, 10, 5);
      ctx2.clip();
      ctx2.fillStyle = "rgba(127,208,121,.25)";
      ctx2.fillRect(bx + bw * 0.25, by + 16, bw * 0.6, 10);
      ctx2.fillStyle = k < 0.2 ? C.yellow : k > 0.85 ? C.red : C.copper2;
      ctx2.fillRect(bx, by + 16, bw * k, 10);
      ctx2.restore();
      sans(ctx2, k < 0.2 ? "\u043E\u0441\u0442\u044B\u0432\u0430\u0435\u0442!" : k > 0.85 ? "\u043F\u0435\u0440\u0435\u0433\u0440\u0435\u0432" : "", bx + bw, by + 6, 11, k < 0.2 ? C.yellow : C.red, "right", "700");
    }
  }
  function drawStoker(ctx2, R) {
    const { s: s2, L: L2, time: time2, vis: vis2 } = R;
    const f = L2.furnace;
    const sx = f.x + (L2.portrait ? -18 : f.w - 36), sy = f.y + f.h - (L2.portrait ? 6 : 42);
    if (L2.portrait)
      return drawChildOnly(ctx2, R);
    const swing = vis2.swing;
    ctx2.save();
    ctx2.translate(f.x + f.w + 26, f.y + f.h - 12);
    ctx2.fillStyle = "#0c0907";
    ctx2.beginPath();
    ctx2.ellipse(0, -48, 12, 13, 0, 0, TAU);
    ctx2.fill();
    ctx2.beginPath();
    ctx2.moveTo(-14, 0);
    ctx2.quadraticCurveTo(-16, -30, 0, -34);
    ctx2.quadraticCurveTo(16, -30, 14, 0);
    ctx2.fill();
    ctx2.strokeStyle = "#0c0907";
    ctx2.lineWidth = 4;
    ctx2.beginPath();
    ctx2.moveTo(-6, -22);
    ctx2.lineTo(-30 + swing * 16, -12 - swing * 8);
    ctx2.stroke();
    ctx2.lineWidth = 3;
    ctx2.beginPath();
    ctx2.moveTo(-30 + swing * 16, -12 - swing * 8);
    ctx2.lineTo(-50 + swing * 30, -2 - swing * 12);
    ctx2.stroke();
    ctx2.restore();
    drawChildOnly(ctx2, R);
  }
  function drawChildOnly(ctx2, R) {
    const { s: s2, L: L2, vis: vis2 } = R;
    if (!s2.flags.timka)
      return;
    const f = L2.furnace;
    const x = L2.portrait ? f.x + f.w - 18 : f.x + f.w - 4 + 66, y = f.y + f.h - 10;
    ctx2.save();
    ctx2.translate(x, y);
    ctx2.fillStyle = "#16100c";
    ctx2.beginPath();
    ctx2.arc(0, -34, 8, 0, TAU);
    ctx2.fill();
    ctx2.beginPath();
    ctx2.moveTo(-9, 0);
    ctx2.quadraticCurveTo(-10, -22, 0, -24);
    ctx2.quadraticCurveTo(10, -22, 9, 0);
    ctx2.fill();
    ctx2.strokeStyle = "#16100c";
    ctx2.lineWidth = 3;
    const sw = vis2.kidSwing;
    ctx2.beginPath();
    ctx2.moveTo(0, -18);
    ctx2.lineTo(-18 + sw * 8, -8);
    ctx2.stroke();
    ctx2.restore();
  }
  function drawCoalAndShovel(ctx2, R) {
    const { s: s2, L: L2, input: input2 } = R;
    const sv = L2.shovel;
    if (L2.coal) {
      const c = L2.coal;
      plate(ctx2, c.x, c.y, c.w, c.h, { r: 10 });
      sans(ctx2, "\u0411\u0423\u041D\u041A\u0415\u0420", c.x + c.w / 2, c.y + 18, 12, C.dim, "center", "700");
      const bx = c.x + 14, by = c.y + 34, bw = c.w - 28, bh = c.h - 74;
      rr(ctx2, bx, by, bw, bh, 6);
      ctx2.fillStyle = "#0b0807";
      ctx2.fill();
      const f = clamp(s2.coal / COAL_MAX, 0, 1) ** 0.8;
      ctx2.save();
      rr(ctx2, bx, by, bw, bh, 6);
      ctx2.clip();
      const top = by + bh * (1 - f);
      ctx2.fillStyle = "#1d1815";
      ctx2.fillRect(bx, top, bw, by + bh - top);
      const rn = makeRng(9);
      for (let i = 0; i < 60; i++) {
        const px = bx + rn() * bw, py = top + rn() * (by + bh - top);
        if (py < top + 2)
          continue;
        ctx2.fillStyle = `rgba(${80 + rn() * 60 | 0},${75 + rn() * 50 | 0},${70 + rn() * 50 | 0},.35)`;
        ctx2.fillRect(px, py, 3 + rn() * 4, 2 + rn() * 3);
      }
      ctx2.fillStyle = "#2b2420";
      for (let i = 0; i < 12; i++) {
        ctx2.beginPath();
        ctx2.arc(bx + (i + 0.5) * bw / 12, top + i * 5 % 4, 5, Math.PI, 0);
        ctx2.fill();
      }
      ctx2.restore();
      rr(ctx2, bx, by, bw, bh, 6);
      ctx2.strokeStyle = "rgba(255,230,180,.25)";
      ctx2.lineWidth = 1.5;
      ctx2.stroke();
      const cc = s2.coal < 6 ? C.red : s2.coal < 14 ? C.yellow : C.cream;
      text(ctx2, String(Math.floor(s2.coal)), c.x + c.w / 2, c.y + c.h - 20, 22, cc, "center");
    }
    const pressed = input2.shovelDown > 0;
    const cd = clamp(s2.shovelCd / SHOVEL_CD, 0, 1);
    ctx2.save();
    ctx2.translate(0, pressed ? 2 : 0);
    rr(ctx2, sv.x, sv.y, sv.w, sv.h, 12);
    ctx2.fillStyle = copperGrad(ctx2, sv.x, sv.y, sv.x + sv.w, sv.y + sv.h);
    ctx2.fill();
    ctx2.lineWidth = 2.5;
    ctx2.strokeStyle = "rgba(0,0,0,.75)";
    ctx2.stroke();
    rr(ctx2, sv.x + 3, sv.y + 3, sv.w - 6, sv.h - 6, 10);
    ctx2.strokeStyle = "rgba(255,230,180,.35)";
    ctx2.lineWidth = 1.5;
    ctx2.stroke();
    if (cd > 0) {
      ctx2.save();
      rr(ctx2, sv.x, sv.y, sv.w, sv.h, 12);
      ctx2.clip();
      ctx2.fillStyle = "rgba(0,0,0,.45)";
      ctx2.fillRect(sv.x, sv.y, sv.w * cd, sv.h);
      ctx2.restore();
    }
    const noCoal = s2.coal < 1;
    if (L2.portrait) {
      icon(ctx2, "shovel", sv.x + 36, sv.y + sv.h / 2, 30, noCoal ? C.dim : "#2a1409");
      text(ctx2, noCoal ? "\u0423\u0413\u041B\u042F \u041D\u0415\u0422" : "\u041F\u041E\u0414\u0411\u0420\u041E\u0421\u0418\u0422\u042C \u0423\u0413\u041E\u041B\u042C", sv.x + sv.w / 2 + 14, sv.y + sv.h / 2, 18, noCoal ? C.dim : "#2a1409", "center", "bold", false);
    } else {
      icon(ctx2, "shovel", sv.x + sv.w / 2, sv.y + sv.h / 2 - 28, 56, noCoal ? C.dim : "#2a1409");
      text(ctx2, noCoal ? "\u0423\u0413\u041B\u042F \u041D\u0415\u0422" : "\u0423\u0413\u041E\u041B\u042C", sv.x + sv.w / 2, sv.y + sv.h / 2 + 22, 22, noCoal ? C.dim : "#2a1409", "center", "bold", false);
      sans(ctx2, "[ \u041F\u0420\u041E\u0411\u0415\u041B ]", sv.x + sv.w / 2, sv.y + sv.h / 2 + 52, 13, "#2a1409", "center", "800");
    }
    ctx2.restore();
  }
  function drawColumns(ctx2, R) {
    const { s: s2, L: L2, vis: vis2, input: input2, time: time2 } = R;
    const m = L2.modules;
    const col0 = column(L2, 0), col3 = column(L2, 3);
    const my = L2.manifoldY;
    const pw = L2.portrait ? 12 : 14;
    pipe(ctx2, [[L2.trunk[1][0], my], [Math.max(col3.cx, L2.trunk[1][0]), my]], pw, "copper");
    if (col0.cx < L2.trunk[1][0])
      pipe(ctx2, [[col0.cx, my], [L2.trunk[1][0], my]], pw, "copper");
    for (let i = 0; i < 4; i++) {
      const c = column(L2, i);
      pipe(ctx2, [[c.cx, my], [c.cx, m.y + 18]], L2.portrait ? 9 : 10, "copper");
      flange(ctx2, c.cx, my + (m.y - my) * 0.5 + 1, 16, 6);
      flowDots(ctx2, c.cx, my + 4, c.cx, m.y + 12, vis2.t * 1.4, s2.flow[i] / CAP[i] * 1.2);
    }
    flowDots(ctx2, L2.trunk[0][0], L2.trunk[0][1] - 4, L2.trunk[1][0], my, vis2.t * 1.2, clamp(s2.flow.reduce((a, b) => a + b, 0) / 10, 0, 1));
    for (let i = 0; i < 4; i++)
      drawColumn(ctx2, R, i);
    for (const lk of s2.leaks) {
      const c = column(L2, lk.pipe), lx = c.leak.x, ly = c.leak.y - (L2.portrait ? 2 : 0);
      ctx2.save();
      R.fx.steam(lx, ly - 4, 0.7, { vy: -70, vx: 0, jx: 40, r: 6, grow: 34, life: 0.9, a: 0.6 });
      const pulse = R.reduced ? 1 : 0.8 + 0.2 * Math.sin(time2 * 6);
      ctx2.fillStyle = `rgba(224,82,60,${0.9})`;
      ctx2.beginPath();
      ctx2.arc(lx, ly, 13 * pulse, 0, TAU);
      ctx2.fill();
      ctx2.lineWidth = 2.5;
      ctx2.strokeStyle = "#fff3d0";
      ctx2.stroke();
      text(ctx2, "!", lx, ly + 1, 16, "#fff", "center", "bold", false);
      ctx2.restore();
    }
  }
  function drawColumn(ctx2, R, i) {
    const { s: s2, L: L2, vis: vis2, input: input2, time: time2 } = R;
    const c = column(L2, i), d = DISTRICTS[i];
    const por = L2.portrait;
    plate(ctx2, c.x, c.y, c.w, c.h, { r: 9, inset: 6, rr: 2, step: 60 });
    const selected = input2.sel === i;
    if (selected) {
      rr(ctx2, c.x - 2, c.y - 2, c.w + 4, c.h + 4, 11);
      ctx2.lineWidth = 3;
      ctx2.strokeStyle = C.gold;
      ctx2.stroke();
    }
    icon(ctx2, d.icon, c.cx, c.y + (por ? 17 : 21), por ? 17 : 22, C.cream);
    text(ctx2, d.name, c.cx, c.y + (por ? 36 : 44), por ? 12 : 15, C.cream, "center");
    if (!por) {
      rr(ctx2, c.x + 8, c.y + 8, 20, 20, 5);
      ctx2.fillStyle = "rgba(0,0,0,.55)";
      ctx2.fill();
      sans(ctx2, String(i + 1), c.x + 18, c.y + 18.5, 12, C.gold, "center", "800");
    }
    const tx = c.cx, y0 = c.ty0, y1 = c.ty1, tw = por ? 16 : 20;
    rr(ctx2, tx - tw / 2, y0 - 6, tw, y1 - y0 + 12, tw / 2);
    ctx2.fillStyle = "#0b0807";
    ctx2.fill();
    ctx2.strokeStyle = "rgba(255,230,180,.25)";
    ctx2.lineWidth = 1.5;
    ctx2.stroke();
    const val = s2.valves[i], vy = y1 - (y1 - y0) * val;
    ctx2.strokeStyle = "rgba(255,230,180,.25)";
    ctx2.lineWidth = 1;
    for (let k = 0; k <= 10; k++) {
      const yy = y1 - (y1 - y0) * k / 10, lw = k % 5 === 0 ? 7 : 4;
      ctx2.beginPath();
      ctx2.moveTo(tx + tw / 2 + 3, yy);
      ctx2.lineTo(tx + tw / 2 + 3 + lw, yy);
      ctx2.stroke();
    }
    ctx2.save();
    rr(ctx2, tx - tw / 2, y0 - 6, tw, y1 - y0 + 12, tw / 2);
    ctx2.clip();
    const sg = ctx2.createLinearGradient(0, vy, 0, y1);
    sg.addColorStop(0, "rgba(235,245,240,.9)");
    sg.addColorStop(1, "rgba(120,170,180,.55)");
    ctx2.fillStyle = sg;
    ctx2.fillRect(tx - tw / 2, vy, tw, y1 - vy + 8);
    ctx2.restore();
    const need = Math.min(1, s2.needNow[i] / CAP[i]), ny = y1 - (y1 - y0) * need;
    const nCol = Math.abs(val - need) < 0.06 ? C.green : C.gold;
    ctx2.fillStyle = nCol;
    ctx2.beginPath();
    ctx2.moveTo(tx - tw / 2 - 3, ny);
    ctx2.lineTo(tx - tw / 2 - 12, ny - 6);
    ctx2.lineTo(tx - tw / 2 - 12, ny + 6);
    ctx2.closePath();
    ctx2.fill();
    ctx2.beginPath();
    ctx2.moveTo(tx + tw / 2 + 3, ny);
    ctx2.lineTo(tx + tw / 2 + 12, ny - 6);
    ctx2.lineTo(tx + tw / 2 + 12, ny + 6);
    ctx2.closePath();
    ctx2.fill();
    ctx2.fillRect(tx - tw / 2 - 3, ny - 1, tw + 6, 2);
    if (!por && i === 0)
      sans(ctx2, "\u043D\u0443\u0436\u043D\u043E", c.x + c.w - 6, ny - 11, 11, C.gold, "right", "700");
    const wr = por ? 15 : 19;
    ctx2.save();
    ctx2.translate(tx, vy);
    ctx2.rotate(val * 9 + (vis2.wheelKick[i] || 0));
    ctx2.fillStyle = "rgba(0,0,0,.4)";
    ctx2.beginPath();
    ctx2.arc(2, 3, wr, 0, TAU);
    ctx2.fill();
    ctx2.strokeStyle = brassGrad(ctx2, -wr, -wr, wr, wr);
    ctx2.lineWidth = 5;
    ctx2.beginPath();
    ctx2.arc(0, 0, wr - 3, 0, TAU);
    ctx2.stroke();
    ctx2.lineWidth = 3.4;
    ctx2.strokeStyle = "#a98332";
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU;
      ctx2.beginPath();
      ctx2.moveTo(0, 0);
      ctx2.lineTo(Math.cos(a) * (wr - 3), Math.sin(a) * (wr - 3));
      ctx2.stroke();
    }
    ctx2.fillStyle = copperGrad(ctx2, -6, -6, 6, 6);
    ctx2.beginPath();
    ctx2.arc(0, 0, 5.5, 0, TAU);
    ctx2.fill();
    ctx2.strokeStyle = "#000";
    ctx2.lineWidth = 1;
    ctx2.stroke();
    ctx2.fillStyle = C.red;
    ctx2.fillRect(wr - 5, -1.5, 5, 3);
    ctx2.restore();
    if (selected) {
      ctx2.beginPath();
      ctx2.arc(tx, vy, wr + 4, 0, TAU);
      ctx2.strokeStyle = "rgba(255,211,107,.7)";
      ctx2.lineWidth = 2;
      ctx2.stroke();
    }
    sans(ctx2, Math.round(val * 100) + "%", c.cx, y1 + (por ? 16 : 19), por ? 12 : 14, C.cream, "center", "700");
    const sat = vis2.satShown[i];
    const by = c.y + c.h - (por ? 30 : 34), bx = c.x + 8, bw = c.w - 16;
    const satCol = sat >= 0.85 ? C.green : sat >= 0.6 ? C.yellow : C.red;
    rr(ctx2, bx, by, bw, por ? 9 : 11, 4.5);
    ctx2.fillStyle = "rgba(0,0,0,.6)";
    ctx2.fill();
    rr(ctx2, bx, by, Math.max(5, bw * sat), por ? 9 : 11, 4.5);
    ctx2.fillStyle = satCol;
    ctx2.fill();
    ctx2.fillStyle = "rgba(255,255,255,.8)";
    ctx2.fillRect(bx + bw * 0.85 - 0.5, by - 1, 1, (por ? 9 : 11) + 2);
    const ly = by + (por ? 20 : 24);
    if (i === 2) {
      const fw = s2.fw / 100, wc = s2.burnT > 0 ? C.red : fw > 0.75 ? C.red : fw > 0.5 ? C.yellow : C.green;
      meter(ctx2, bx, ly - 6, bw, por ? "\u0443\u0441\u0442\u0430\u043B." : "\u0443\u0441\u0442\u0430\u043B\u043E\u0441\u0442\u044C", fw, wc, por);
    } else if (i === 3) {
      const sm = s2.smog / 100;
      meter(ctx2, bx, ly - 6, bw, "\u0434\u044B\u043C", sm, sm > 0.65 ? C.red : sm > 0.35 ? C.yellow : C.green, por);
    } else if (i === 0)
      sans(ctx2, sat > 0.85 ? "\u0442\u0435\u043F\u043B\u043E" : sat > 0.6 ? "\u043F\u0440\u043E\u0445\u043B\u0430\u0434\u043D\u043E" : "\u0412\u042B\u041C\u0418\u0420\u0410\u042E\u0422", c.cx, ly, por ? 11 : 13, satCol, "center", "700");
    else
      sans(ctx2, sat > 0.85 ? "\u0442\u0435\u043F\u043B\u043E" : sat > 0.6 ? "\u0437\u044F\u0431\u043A\u043E" : "\u0417\u0410\u041C\u0415\u0420\u0417\u0410\u042E\u0422", c.cx, ly, por ? 11 : 13, satCol, "center", "700");
    if (i === 2 && s2.burnT > 0) {
      sans(ctx2, "\u0421\u041C\u0415\u041D\u0410 \u041F\u0410\u041B\u0410", c.cx, c.y + (por ? 52 : 62), por ? 10 : 12, C.red, "center", "800");
    }
    if (R.tutHint === "v" + i)
      pulseRing(ctx2, c.x - 3, c.y - 3, c.w + 6, c.h + 6, time2, R.reduced);
  }
  function meter(ctx2, x, y, w, label, v, col, por) {
    sans(ctx2, label, x, y, por ? 10 : 12, C.dim, "left", "700");
    const bx = x + (por ? 40 : 66), bw = w - (por ? 40 : 66);
    rr(ctx2, bx, y - 4, bw, 9, 4.5);
    ctx2.fillStyle = "rgba(0,0,0,.6)";
    ctx2.fill();
    rr(ctx2, bx, y - 4, Math.max(4, bw * clamp(v, 0, 1)), 9, 4.5);
    ctx2.fillStyle = col;
    ctx2.fill();
  }
  function pulseRing(ctx2, x, y, w, h, time2, reduced) {
    ctx2.save();
    const a = reduced ? 1 : 0.55 + 0.45 * Math.sin(time2 * 4);
    rr(ctx2, x, y, w, h, 12);
    ctx2.lineWidth = 4;
    ctx2.strokeStyle = `rgba(255,211,107,${a})`;
    ctx2.setLineDash([10, 6]);
    ctx2.lineDashOffset = reduced ? 0 : -time2 * 20;
    ctx2.stroke();
    ctx2.restore();
  }
  function drawToast(ctx2, R, m, px, pw) {
    const tt = R.toast, age = R.time - tt.t0;
    const k = clamp(Math.min(age / 0.3, (tt.dur - age) / 0.8), 0, 1);
    ctx2.save();
    ctx2.globalAlpha = k;
    text(ctx2, String(tt.title || "").toUpperCase(), px, m.y + 16, 11, tt.col || C.gold, "left", "bold", false);
    const avail = m.h - 36;
    let fs = 16, lines = [];
    for (const f of [16, 14, 13, 12]) {
      fs = f;
      ctx2.font = `${f}px Georgia, serif`;
      lines = wrap(ctx2, tt.text, pw);
      if (lines.length * (f + 4) <= avail)
        break;
    }
    const cap = Math.max(1, Math.floor(avail / (fs + 4)));
    if (lines.length > cap) {
      lines = lines.slice(0, cap);
      let last2 = lines[cap - 1];
      ctx2.font = `${fs}px Georgia, serif`;
      while (last2.length > 3 && ctx2.measureText(last2 + "\u2026").width > pw)
        last2 = last2.slice(0, -1);
      lines[cap - 1] = last2.replace(/[\s,;:—-]+$/, "") + "\u2026";
    }
    lines.forEach((ln, i) => text(ctx2, ln, px, m.y + 34 + fs / 2 + i * (fs + 4), fs, C.cream, "left", "normal", false));
    ctx2.restore();
  }
  function drawMessages(ctx2, R) {
    const { s: s2, L: L2, log: log2, time: time2 } = R;
    const m = L2.msg;
    plate(ctx2, m.x, m.y, m.w, m.h, { r: 10, top: "#2c231b", bot: "#17110d", rivets: !L2.portrait });
    const px = m.x + 14, pw = m.w - 28;
    if (R.toast && time2 - R.toast.t0 < R.toast.dur) {
      drawToast(ctx2, R, m, px, pw);
      return;
    }
    const maxLines = Math.max(2, Math.floor((m.h - 20) / (L2.portrait ? 38 : 40)));
    const shown = log2.slice(-maxLines);
    let yy = m.y + 14;
    const fs = L2.portrait ? 14 : 16;
    if (!shown.length)
      sans(ctx2, "\u0414\u0435\u0440\u0436\u0438\u0442\u0435 \u0434\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0432 \u0437\u0435\u043B\u0451\u043D\u043E\u0439 \u0437\u043E\u043D\u0435. \u0411\u0435\u0440\u0435\u0433\u0438\u0442\u0435 \u043B\u044E\u0434\u0435\u0439.", px, m.y + 22, fs - 1, C.dim, "left", "600");
    shown.forEach((e) => {
      const age = time2 - e.at, a = e.kind === "talk" ? 1 : 1;
      ctx2.globalAlpha = a * clamp(1 - (age - 20) / 8, 0.45, 1);
      ctx2.font = `bold ${fs}px Georgia, serif`;
      const who = e.who ? e.who + ": " : "";
      const wW = ctx2.measureText(who).width;
      ctx2.font = `${fs}px Georgia, serif`;
      const lines = wrap(ctx2, e.text, pw - wW);
      lines.slice(0, 2).forEach((ln, k) => {
        if (k === 0 && who)
          text(ctx2, who, px, yy + 9, fs, e.col || C.gold, "left", "bold", false);
        text(ctx2, ln, px + (k === 0 ? wW : 0), yy + 9 + k * (fs + 3), fs, e.kind === "warn" ? C.yellow : C.cream, "left", "normal", false);
      });
      yy += (lines.length > 1 ? 2 : 1) * (fs + 3) + 6;
      ctx2.globalAlpha = 1;
    });
  }
  function drawBanner(ctx2, R) {
    const b = R.banner;
    if (!b)
      return;
    const age = R.time - b.at;
    if (age > 4.5)
      return;
    const L2 = R.L;
    const k = age < 0.4 ? age / 0.4 : age > 3.8 ? (4.5 - age) / 0.7 : 1;
    const w = Math.min(L2.W - 24, 460), h = 40, x = (L2.W - w) / 2, y = L2.sky.y + L2.sky.h + 12 - (1 - k) * 30;
    ctx2.save();
    ctx2.globalAlpha = clamp(k, 0, 1);
    rr(ctx2, x, y, w, h, 8);
    ctx2.fillStyle = "rgba(32,22,14,.94)";
    ctx2.fill();
    ctx2.lineWidth = 2;
    ctx2.strokeStyle = C.brass1;
    ctx2.stroke();
    icon(ctx2, "drop", x + 24, y + h / 2, 16, C.water);
    text(ctx2, b.label, x + 44, y + h / 2, L2.portrait ? 14 : 16, C.cream, "left", "bold", false);
    ctx2.restore();
  }
  function mpTag(ctx2, x, y, w, label, mine, size) {
    const h = size + 8;
    ctx2.save();
    ctx2.fillStyle = mine ? "rgba(224,180,85,.96)" : "rgba(20,14,10,.88)";
    rr(ctx2, x - w / 2, y - h / 2, w, h, h / 2);
    ctx2.fill();
    ctx2.lineWidth = 1.5;
    ctx2.strokeStyle = mine ? "#fff3d0" : "#7d5f21";
    ctx2.stroke();
    text(ctx2, label, x, y + 1, size, mine ? "#24160a" : "#f1e6c8", "center", "bold", false);
    ctx2.restore();
  }
  function drawMpOverlay(ctx2, R) {
    const { L: L2, mp: mp2 } = R, por = L2.portrait, size = por ? 10 : 12;
    for (let i = 0; i < 4; i++) {
      const c = column(L2, i), o = mp2.own.valve[i], mine = !!(o && o.pid === mp2.me);
      if (!mine) {
        ctx2.save();
        ctx2.fillStyle = "rgba(10,7,5,.32)";
        rr(ctx2, c.x, c.y, c.w, c.h, 9);
        ctx2.fill();
        ctx2.restore();
      }
      const label = o ? mine ? "\u0412\u042B" : o.nick : "\u2014";
      mpTag(ctx2, c.cx, c.y + c.h - (por ? 12 : 14), Math.min(c.w - 6, 20 + label.length * (size * 0.62)), label, mine, size);
    }
    const sh = L2.shovel, so = mp2.own.shovel, smine = !!(so && so.pid === mp2.me);
    if (!smine) {
      ctx2.save();
      ctx2.fillStyle = "rgba(10,7,5,.38)";
      rr(ctx2, sh.x, sh.y, sh.w, sh.h, 8);
      ctx2.fill();
      ctx2.restore();
    }
    const sl = smine ? "\u041B\u041E\u041F\u0410\u0422\u0410: \u0412\u042B" : "\u043B\u043E\u043F\u0430\u0442\u0430: " + (so ? so.nick : "\u2014");
    mpTag(ctx2, sh.x + sh.w / 2, sh.y + 10, Math.min(Math.max(sh.w, 96), 20 + sl.length * (size * 0.6)), sl, smine, size);
    const lo = mp2.own.leaks;
    if (lo)
      for (const lk of R.s.leaks) {
        const c = column(L2, lk.pipe), lmine = lo.pid === mp2.me;
        mpTag(ctx2, c.leak.x, c.leak.y - 26, 18 + (lmine ? "\u0412\u042B" : lo.nick).length * (size * 0.6), lmine ? "\u0412\u042B" : lo.nick, lmine, size);
      }
  }
  function drawScene(ctx2, R) {
    const { L: L2 } = R;
    ctx2.save();
    drawCity(ctx2, R);
    ctx2.save();
    ctx2.beginPath();
    ctx2.rect(-L2.offX, L2.hud.h, L2.fullW, L2.chimney.y - L2.hud.h);
    ctx2.clip();
    R.fx.draw(ctx2, "smoke");
    ctx2.restore();
    for (const g of R.gears)
      drawGear(ctx2, g.x, g.y, g.r, g.n, g.rot, g.kind, g.a, R.dpr * R.scale);
    drawHUD(ctx2, R);
    drawGauge(ctx2, R);
    drawBoiler(ctx2, R);
    drawFurnace(ctx2, R);
    drawStoker(ctx2, R);
    drawCoalAndShovel(ctx2, R);
    drawColumns(ctx2, R);
    drawMessages(ctx2, R);
    if (R.tutHint === "shovel")
      pulseRing(ctx2, L2.shovel.x - 3, L2.shovel.y - 3, L2.shovel.w + 6, L2.shovel.h + 6, R.time, R.reduced);
    if (R.tutHint === "gauge")
      pulseRing(ctx2, L2.gauge.cx - L2.gauge.r - 8, L2.gauge.cy - L2.gauge.r - 8, L2.gauge.r * 2 + 16, L2.gauge.r * 2 + 16, R.time, R.reduced);
    if (R.tutHint === "leak")
      for (const lk of R.s.leaks) {
        const c = column(L2, lk.pipe);
        pulseRing(ctx2, c.leak.x - 22, c.leak.y - 22, 44, 44, R.time, R.reduced);
      }
    if (R.mp)
      drawMpOverlay(ctx2, R);
    drawBanner(ctx2, R);
    R.fx.draw(ctx2, "main");
    if (R.s.P > P_VENT - 4 || R.s.danger > 0) {
      const k = clamp((R.s.P - (P_VENT - 4)) / 12, 0, 1);
      const pulse = R.reduced ? 0.7 : 0.7 + 0.3 * Math.sin(R.time * 4);
      const vg = ctx2.createRadialGradient(L2.W / 2, L2.H / 2, Math.min(L2.W, L2.H) * 0.4, L2.W / 2, L2.H / 2, Math.max(L2.W, L2.H) * 0.8);
      vg.addColorStop(0, "rgba(200,40,20,0)");
      vg.addColorStop(1, `rgba(200,40,20,${0.35 * k * pulse})`);
      ctx2.fillStyle = vg;
      ctx2.fillRect(0, 0, L2.W, L2.H);
    }
    ctx2.restore();
  }

  // src/ui/fx.js
  var MAX = 700;
  var Fx = class {
    constructor() {
      this.p = [];
      this.texts = [];
      this.rng = makeRng(2024);
      this.reduced = false;
      this.shakeOn = true;
      this.shakeAmt = 0;
    }
    clear() {
      this.p.length = 0;
      this.texts.length = 0;
      this.shakeAmt = 0;
    }
    get density() {
      return this.reduced ? 0.35 : 1;
    }
    add(o) {
      if (this.p.length < (this.reduced ? 100 : MAX))
        this.p.push(o);
    }
    steam(x, y, n = 1, o = {}) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i;
      const r = this.rng;
      n = Math.ceil(n * this.density);
      for (let i = 0; i < n; i++) {
        this.add({
          k: "steam",
          x: x + (r() - 0.5) * ((_a = o.spread) != null ? _a : 6),
          y,
          vx: ((_b = o.vx) != null ? _b : 0) + (r() - 0.5) * ((_c = o.jx) != null ? _c : 18),
          vy: ((_d = o.vy) != null ? _d : -40) * (0.6 + r() * 0.8),
          r: ((_e = o.r) != null ? _e : 7) * (0.7 + r() * 0.6),
          grow: (_f = o.grow) != null ? _f : 18,
          life: 0,
          max: ((_g = o.life) != null ? _g : 1.1) * (0.7 + r() * 0.6),
          a: (_h = o.a) != null ? _h : 0.5,
          col: (_i = o.col) != null ? _i : "236,242,238"
        });
      }
    }
    sparks(x, y, n = 10, o = {}) {
      var _a, _b, _c, _d;
      const r = this.rng;
      n = Math.ceil(n * this.density);
      for (let i = 0; i < n; i++) {
        const a = ((_a = o.dir) != null ? _a : -Math.PI / 2) + (r() - 0.5) * ((_b = o.cone) != null ? _b : 2.2), v = ((_c = o.v) != null ? _c : 160) * (0.4 + r());
        this.add({ k: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1.6 + r() * 1.6, life: 0, max: 0.5 + r() * 0.5, g: 380, col: (_d = o.col) != null ? _d : "255,190,80" });
      }
    }
    smoke(x, y, n = 1, a = 0.35) {
      const r = this.rng;
      n = Math.ceil(n * this.density);
      for (let i = 0; i < n; i++)
        this.add({ k: "smoke", x: x + (r() - 0.5) * 8, y, vx: 8 + r() * 10, vy: -(26 + r() * 18), r: 6, grow: 6, life: 0, max: 3 + r() * 1.4, a, col: "70,64,60" });
    }
    text(x, y, str, col = "#f1e6c8", size = 16) {
      if (this.texts.length < 20)
        this.texts.push({ x, y, str, col, size, life: 0, max: 1.6 });
    }
    shake(a) {
      if (this.shakeOn && !this.reduced)
        this.shakeAmt = Math.max(this.shakeAmt, a);
    }
    update(dt) {
      for (let i = this.p.length - 1; i >= 0; i--) {
        const q = this.p[i];
        q.life += dt;
        if (q.life >= q.max) {
          this.p[i] = this.p[this.p.length - 1];
          this.p.pop();
          continue;
        }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (q.k === "spark")
          q.vy += q.g * dt;
        else {
          q.r += q.grow * dt;
          q.vx *= 1 - dt * 0.5;
        }
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.life += dt;
        t.y -= 26 * dt;
        if (t.life > t.max)
          this.texts.splice(i, 1);
      }
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2);
    }
    shakeOffset() {
      if (this.shakeAmt <= 0 || this.reduced || !this.shakeOn)
        return [0, 0];
      const a = this.shakeAmt * this.shakeAmt * 10, r = this.rng;
      return [(r() - 0.5) * a, (r() - 0.5) * a];
    }
    // pass: 'smoke' — только дым трубы (рисуется под HUD и котлом); иначе — всё остальное
    draw(ctx2, pass) {
      const smokePass = pass === "smoke";
      for (const q of this.p) {
        if (q.k === "smoke" !== smokePass)
          continue;
        const f = q.life / q.max;
        if (q.k === "spark") {
          ctx2.fillStyle = `rgba(${q.col},${1 - f})`;
          ctx2.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r);
        } else {
          const a = q.a * Math.sin(Math.min(1, f * 6) * Math.PI / 2) * (1 - f);
          ctx2.fillStyle = `rgba(${q.col},${a.toFixed(3)})`;
          ctx2.beginPath();
          ctx2.arc(q.x, q.y, q.r, 0, 6.2832);
          ctx2.fill();
        }
      }
      if (smokePass)
        return;
      ctx2.textAlign = "center";
      ctx2.textBaseline = "middle";
      for (const t of this.texts) {
        const f = t.life / t.max;
        ctx2.globalAlpha = 1 - f * f;
        ctx2.font = `bold ${t.size}px Georgia, serif`;
        ctx2.lineWidth = 3;
        ctx2.strokeStyle = "rgba(0,0,0,.7)";
        ctx2.strokeText(t.str, t.x, t.y);
        ctx2.fillStyle = t.col;
        ctx2.fillText(t.str, t.x, t.y);
      }
      ctx2.globalAlpha = 1;
    }
  };

  // src/audio/audio.js
  var DB_RANGE = 40;
  function volCurve(v) {
    v = Math.max(0, Math.min(1, +v || 0));
    return v <= 1e-3 ? 0 : Math.pow(10, -(DB_RANGE / 20) * (1 - v));
  }
  var SFX_MAX = 2.2;
  var MUSIC_MAX = 1.6;
  var Sound = class {
    // makeCtx — необязательная фабрика AudioContext (тесты подставляют мок или OfflineAudioContext)
    constructor(makeCtx) {
      this.makeCtx = makeCtx || null;
      this.ctx = null;
      this.enabled = true;
      this.sfxVol = 0.7;
      this.musicVol = 0.6;
      this.master = null;
      this.sfx = null;
      this.music = null;
      this.noiseBuf = null;
      this.hiss = null;
      this.rumble = null;
      this.musicTimer = null;
      this.step = 0;
      this.nextT = 0;
      this.musicOn = false;
      this.rng = makeRng(77);
      this.lastT = {};
      this.gestured = false;
      this.wantMusic = false;
      this.primed = null;
      this.keepEl = null;
      this.onState = null;
    }
    ensure() {
      if (this.dead)
        return false;
      if (this.ctx && this.ctx.state === "closed")
        this.dropCtx();
      if (this.ctx) {
        if (this.ctx.state !== "running")
          this.tryResume();
        return !!this.ctx;
      }
      try {
        if (this.makeCtx)
          this.ctx = this.makeCtx();
        else {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC)
            return false;
          this.ctx = new AC();
        }
      } catch (e) {
        this.dead = true;
        return false;
      }
      try {
        const c = this.ctx;
        if ("onstatechange" in c)
          c.onstatechange = () => this.notify();
        this.master = c.createGain();
        this.sfx = c.createGain();
        this.music = c.createGain();
        const comp = c.createDynamicsCompressor();
        this.sfx.connect(this.master);
        this.music.connect(this.master);
        this.master.connect(comp);
        comp.connect(c.destination);
        this.noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++)
          d[i] = this.rng() * 2 - 1;
        this.applyVol(true);
        this.buildLoops();
        if (this.wantMusic && !this.musicOn)
          this.startMusic();
        if (c.state !== "running")
          this.tryResume();
        this.notify();
        return true;
      } catch (e) {
        this.dead = true;
        try {
          this.ctx.close();
        } catch (e2) {
        }
        this.ctx = null;
        return false;
      }
    }
    // ---- мобильный звук: жест, «разблокировка», режим «Без звука» на iOS, возобновление после сворачивания
    get state() {
      return this.dead ? "dead" : !this.ctx ? "none" : this.ctx.state;
    }
    // звук нужен (включён, игрок уже касался экрана), но контекст не играет — показать кнопку «Включить звук»
    needsTap() {
      return !this.dead && this.enabled && this.gestured && (!this.ctx || this.ctx.state !== "running");
    }
    notify() {
      try {
        if (this.onState)
          this.onState(this.state);
      } catch (e) {
      }
    }
    dropCtx() {
      try {
        if (this.ctx) {
          this.ctx.onstatechange = null;
          this.ctx.close();
        }
      } catch (e) {
      }
      this.ctx = null;
      this.master = this.sfx = this.music = this.hiss = this.rumble = null;
      this.primed = null;
      this.wantMusic = this.wantMusic || this.musicOn;
      this.musicOn = false;
      clearInterval(this.musicTimer);
    }
    tryResume() {
      if (!this.ctx)
        return;
      try {
        const pr = this.ctx.resume();
        if (pr && pr.then)
          pr.then(() => this.notify(), () => this.notify());
        else
          this.notify();
      } catch (e) {
        this.notify();
      }
    }
    // вызывать ВНУТРИ жеста (pointerup / touchend / click / keydown): создаёт контекст, resume(), тихий буфер, keep-alive для iOS
    unlock() {
      this.gestured = true;
      const ok = this.ensure();
      this.prime();
      return ok;
    }
    prime() {
      if (!this.ctx || this.primed === this.ctx)
        return;
      this.primed = this.ctx;
      try {
        const c = this.ctx, b = c.createBuffer(1, 1, 22050), src = c.createBufferSource();
        src.buffer = b;
        src.connect(c.destination);
        src.start(0);
      } catch (e) {
      }
      this.keepAlive();
    }
    // iOS: переключатель «Без звука» глушит WebAudio, но не <audio> — тихий зацикленный элемент переводит страницу в «медиа»-сеанс
    keepAlive() {
      try {
        if (typeof navigator !== "undefined" && navigator.audioSession)
          navigator.audioSession.type = "playback";
      } catch (e) {
      }
      try {
        const nav = typeof navigator !== "undefined" ? navigator : {};
        const ios = !!nav.audioSession || /iPhone|iPad|iPod/.test(nav.userAgent || "") || /Macintosh/.test(nav.userAgent || "") && nav.maxTouchPoints > 1;
        const force = typeof window !== "undefined" ? window.__keepAlive : void 0;
        if (force === false || !ios && !force)
          return;
        if (typeof Audio === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined" || !URL.createObjectURL)
          return;
        if (!this.keepEl) {
          const n = 4e3, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer);
          const w = (o, s2) => {
            for (let i = 0; i < s2.length; i++)
              buf[o + i] = s2.charCodeAt(i);
          };
          w(0, "RIFF");
          dv.setUint32(4, 36 + n, true);
          w(8, "WAVE");
          w(12, "fmt ");
          dv.setUint32(16, 16, true);
          dv.setUint16(20, 1, true);
          dv.setUint16(22, 1, true);
          dv.setUint32(24, 8e3, true);
          dv.setUint32(28, 8e3, true);
          dv.setUint16(32, 1, true);
          dv.setUint16(34, 8, true);
          w(36, "data");
          dv.setUint32(40, n, true);
          buf.fill(128, 44);
          const el = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
          el.loop = true;
          el.setAttribute("playsinline", "");
          el.setAttribute("aria-hidden", "true");
          this.keepEl = el;
        }
        const pr = this.keepEl.play();
        if (pr && pr.catch)
          pr.catch(() => {
          });
      } catch (e) {
      }
    }
    // вернулись во вкладку / pageshow / focus: попробовать возобновить (вне жеста может не получиться — тогда покажем кнопку)
    resumeIfNeeded() {
      if (this.dead || !this.enabled || !this.gestured) {
        this.notify();
        return;
      }
      if (this.ctx && this.ctx.state === "closed") {
        this.dropCtx();
        this.notify();
        return;
      }
      if (this.ctx && this.ctx.state !== "running")
        this.tryResume();
      else
        this.notify();
      if (this.keepEl && this.keepEl.paused) {
        try {
          const pr = this.keepEl.play();
          if (pr && pr.catch)
            pr.catch(() => {
            });
        } catch (e) {
        }
      }
    }
    // master — только общий выключатель; «Звуки» и «Музыка» — независимые узлы gain со своей кривой
    applyVol(immediate) {
      if (!this.ctx)
        return;
      const t = this.ctx.currentTime;
      const put = (g, v, tc) => {
        if (immediate) {
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(v, t);
        } else
          g.gain.setTargetAtTime(v, t, tc);
      };
      put(this.master, this.enabled ? 1 : 0, 0.05);
      put(this.sfx, volCurve(this.sfxVol) * SFX_MAX, 0.05);
      put(this.music, volCurve(this.musicVol) * MUSIC_MAX, 0.05);
    }
    set(opts) {
      Object.assign(this, opts);
      this.applyVol();
    }
    noiseSrc(loop = false) {
      const s2 = this.ctx.createBufferSource();
      s2.buffer = this.noiseBuf;
      s2.loop = loop;
      if (!loop)
        s2.loopStart = 0;
      return s2;
    }
    // постоянные петли: шипение пара и гул котла
    buildLoops() {
      const c = this.ctx;
      const n = this.noiseSrc(true);
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 3200;
      f.Q.value = 0.6;
      const g = c.createGain();
      g.gain.value = 0;
      n.connect(f);
      f.connect(g);
      g.connect(this.sfx);
      n.start();
      this.hiss = { g, f };
      const o1 = c.createOscillator(), o2 = c.createOscillator();
      o1.type = "sawtooth";
      o2.type = "triangle";
      o1.frequency.value = 48;
      o2.frequency.value = 71;
      const lf = c.createBiquadFilter();
      lf.type = "lowpass";
      lf.frequency.value = 180;
      const rg = c.createGain();
      rg.gain.value = 0;
      const lfo = c.createOscillator();
      lfo.frequency.value = 6;
      const lg = c.createGain();
      lg.gain.value = 0.02;
      lfo.connect(lg);
      lg.connect(rg.gain);
      o1.connect(lf);
      o2.connect(lf);
      lf.connect(rg);
      rg.connect(this.sfx);
      o1.start();
      o2.start();
      lfo.start();
      this.rumble = { g: rg, o1, o2, lfo };
    }
    // непрерывное состояние: hiss 0..1, rumble 0..1 (зависит от давления)
    ambient(hiss, rumble) {
      if (!this.ctx)
        return;
      const t = this.ctx.currentTime;
      this.hiss.g.gain.setTargetAtTime(this.enabled ? Math.min(0.5, hiss * 0.5) : 0, t, 0.08);
      this.hiss.f.frequency.setTargetAtTime(2200 + hiss * 2800, t, 0.1);
      this.rumble.g.gain.setTargetAtTime(Math.min(0.1, rumble * 0.1), t, 0.2);
      this.rumble.o1.frequency.setTargetAtTime(42 + rumble * 22, t, 0.3);
      this.rumble.lfo.frequency.setTargetAtTime(3 + rumble * 9, t, 0.3);
    }
    silence() {
      this.ambient(0, 0);
    }
    // --- короткие эффекты
    gate(name, ms) {
      const n = performance.now();
      if (this.lastT[name] && n - this.lastT[name] < ms)
        return false;
      this.lastT[name] = n;
      return true;
    }
    env(g, t, a, peak, d) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(1e-4, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(1e-4, t + a + d);
    }
    tone(freq, dur, type = "sine", vol = 0.3, when = 0, dest, slideTo) {
      if (!this.ctx)
        return;
      const c = this.ctx, t = c.currentTime + when;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo)
        o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      this.env(g, t, 6e-3, vol, dur);
      o.connect(g);
      g.connect(dest || this.sfx);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    noise(dur, freq, q, vol, when = 0, type = "bandpass", dest, fto) {
      if (!this.ctx)
        return;
      const c = this.ctx, t = c.currentTime + when;
      const s2 = this.noiseSrc();
      s2.loopStart = 0;
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.setValueAtTime(freq, t);
      if (fto)
        f.frequency.exponentialRampToValueAtTime(fto, t + dur);
      f.Q.value = q;
      const g = c.createGain();
      this.env(g, t, 0.01, vol, dur);
      s2.connect(f);
      f.connect(g);
      g.connect(dest || this.sfx);
      s2.start(t, this.rng() * 1.5, dur + 0.1);
    }
    play(name, arg) {
      if (!this.ctx || !this.enabled)
        return;
      switch (name) {
        case "click":
          if (this.gate("click", 40)) {
            this.tone(900, 0.05, "square", 0.08);
            this.tone(1300, 0.04, "square", 0.05, 0.02);
          }
          break;
        case "shovel":
          this.noise(0.18, 600, 1.2, 0.5);
          this.tone(120, 0.14, "triangle", 0.4, 0, null, 60);
          this.tone(2400 + this.rng() * 600, 0.05, "square", 0.05, 0.03);
          this.noise(0.5, 900, 0.5, 0.18, 0.08, "lowpass", null, 200);
          break;
        case "spill":
          this.noise(0.25, 300, 0.7, 0.4);
          this.tone(90, 0.2, "sawtooth", 0.15, 0, null, 50);
          break;
        case "nocoal":
          if (this.gate("nocoal", 300)) {
            this.tone(180, 0.15, "square", 0.18);
            this.tone(140, 0.2, "square", 0.18, 0.12);
          }
          break;
        case "valve":
          if (this.gate("valve", 70)) {
            const f = 160 + (arg || 0) * 220;
            this.tone(f, 0.07, "triangle", 0.1);
            this.noise(0.05, 2500, 3, 0.06);
          }
          break;
        case "leak":
          this.noise(0.5, 4500, 0.8, 0.25, 0, "highpass");
          this.tone(720, 0.12, "square", 0.1);
          this.tone(540, 0.16, "square", 0.1, 0.14);
          break;
        case "fix":
          this.tone(260, 0.1, "triangle", 0.35, 0, null, 140);
          this.noise(0.14, 1600, 2, 0.3);
          this.tone(880, 0.12, "sine", 0.12, 0.08);
          break;
        case "vent":
          if (this.gate("vent", 160))
            this.noise(0.22, 5200, 0.7, 0.25, 0, "highpass");
          break;
        case "warn":
          if (this.gate("warn", 900)) {
            this.tone(660, 0.18, "square", 0.1);
            this.tone(660, 0.18, "square", 0.1, 0.26);
          }
          break;
        case "loss":
          if (this.gate("loss", 900)) {
            this.tone(70, 0.5, "sine", 0.35, 0, null, 40);
          }
          break;
        case "collapse":
          this.tone(110, 0.8, "sawtooth", 0.25, 0, null, 38);
          this.noise(0.9, 800, 0.5, 0.4, 0, "lowpass", null, 120);
          break;
        case "boom":
          this.noise(2.2, 400, 0.4, 0.9, 0, "lowpass", null, 60);
          this.tone(60, 1.6, "sine", 0.9, 0, null, 24);
          this.noise(1.4, 3e3, 0.6, 0.5, 0.05, "highpass");
          break;
        case "timka":
          this.noise(0.14, 700, 1.2, 0.3);
          this.tone(520, 0.08, "triangle", 0.12);
          break;
        case "tut":
          this.tone(660, 0.12, "triangle", 0.22);
          this.tone(990, 0.2, "triangle", 0.22, 0.1);
          break;
        case "event":
          this.tone(330, 0.3, "sawtooth", 0.12, 0, null, 300);
          this.tone(247, 0.4, "sawtooth", 0.1, 0.15);
          break;
        case "nightend":
          [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.5, "triangle", 0.22, i * 0.13));
          this.noise(0.8, 3e3, 0.5, 0.1, 0, "highpass");
          break;
        case "night":
          this.tone(196, 0.9, "sawtooth", 0.12, 0, null, 150);
          this.noise(0.7, 500, 0.5, 0.2, 0, "lowpass", null, 150);
          break;
        case "gear":
          if (this.gate("gear", 90))
            this.tone(1800 + this.rng() * 300, 0.025, "square", 0.04);
          break;
        case "end-good":
          [262, 330, 392, 523, 659, 784].forEach((f, i) => {
            this.tone(f, 1.2, "triangle", 0.2, i * 0.18);
            this.tone(f * 2, 0.9, "sine", 0.07, i * 0.18);
          });
          break;
        case "end-bitter":
          [262, 311, 392, 466].forEach((f, i) => this.tone(f, 1.4, "triangle", 0.2, i * 0.3));
          break;
        case "end-fail":
          [196, 185, 165, 131].forEach((f, i) => this.tone(f, 1.6, "sawtooth", 0.14, i * 0.4));
          break;
      }
    }
    // --- музыка: минорная паровая «шарманка» с поршневым ритмом
    startMusic() {
      this.wantMusic = true;
      if (!this.ctx || this.musicOn)
        return;
      this.musicOn = true;
      this.step = 0;
      this.nextT = this.ctx.currentTime + 0.1;
      this.musicTimer = setInterval(() => this.schedule(), 120);
    }
    stopMusic() {
      this.wantMusic = false;
      this.musicOn = false;
      clearInterval(this.musicTimer);
    }
    setIntensity(x) {
      this.intensity = x;
    }
    schedule() {
      if (!this.ctx || !this.musicOn)
        return;
      const c = this.ctx, bpm = 92 + (this.intensity || 0) * 22, sp = 60 / bpm / 2;
      while (this.nextT < c.currentTime + 0.4) {
        const st = this.step % 64, bar = Math.floor(st / 8) % 8, t = this.nextT;
        const prog = [57, 53, 48, 55, 57, 53, 52, 55];
        const root = prog[bar] - 24;
        if (st % 4 === 0)
          this.mtone(midi(root), sp * 3.6, "triangle", 0.28, t);
        if (st % 8 === 4)
          this.mtone(midi(root + 7), sp * 2, "triangle", 0.16, t);
        if (st % 4 === 0)
          this.mnoise(0.1, 220, 0.5, 0.5, t, "lowpass");
        if (st % 2 === 1)
          this.mnoise(0.05, 7e3, 0.7, 0.08, t, "highpass");
        if (st % 8 === 6)
          this.mnoise(0.09, 1600, 1, 0.12, t, "bandpass");
        const chord = [0, 3 + (bar === 1 || bar === 2 || bar === 3 || bar === 5 || bar === 7 ? 1 : 0), 7];
        const arp = [0, 2, 1, 2, 0, 1, 2, 1][st % 8];
        const nn = prog[bar] + chord[arp] + (st % 16 >= 8 ? 12 : 0);
        this.mtone(midi(nn), sp * 0.9, "square", 0.055, t, 1500);
        if (st >= 32) {
          const mel = [[0, 7, 0, 3, 0, 0, 5, 3], [3, 0, 5, 0, 7, 0, 5, 0], [7, 0, 0, 5, 3, 0, 2, 0], [0, 0, 3, 5, 7, 0, 0, 0]][bar % 4][st % 8];
          if (mel || st % 8 === 0) {
            if (!(mel === 0 && st % 8 !== 0))
              this.mtone(midi(prog[bar] + 12 + mel), sp * 1.7, "sawtooth", 0.07, t, 1900);
          }
        }
        this.nextT += sp;
        this.step++;
      }
    }
    mtone(f, dur, type, vol, t, lp) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.value = f;
      let out = g;
      if (lp) {
        const fl = c.createBiquadFilter();
        fl.type = "lowpass";
        fl.frequency.value = lp;
        g.connect(fl);
        out = fl;
      }
      g.gain.setValueAtTime(1e-4, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      o.connect(g);
      out.connect(this.music);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    mnoise(dur, freq, q, vol, t, type) {
      const c = this.ctx, s2 = this.noiseSrc(), f = c.createBiquadFilter(), g = c.createGain();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      g.gain.setValueAtTime(1e-4, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 6e-3);
      g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      s2.connect(f);
      f.connect(g);
      g.connect(this.music);
      s2.start(t, this.rng() * 1.5, dur + 0.1);
    }
  };
  for (const name of ["applyVol", "set", "ambient", "silence", "play", "startMusic", "unlock", "prime", "keepAlive", "tryResume", "resumeIfNeeded", "stopMusic", "setIntensity", "schedule"]) {
    const orig = Sound.prototype[name];
    Sound.prototype[name] = function(...args) {
      try {
        return orig.apply(this, args);
      } catch (e) {
        this.errors = (this.errors || 0) + 1;
        return void 0;
      }
    };
  }
  function midi(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  // src/core/bot.js
  function botAct(s2, skill = "good", opts = {}) {
    var _a, _b;
    if (s2.phase === "summary") {
      continueSummary(s2);
      return;
    }
    if (s2.phase === "card") {
      chooseCard(s2, pickChoice(s2, opts));
      return;
    }
    if (s2.phase !== "night")
      return;
    if (skill === "idle")
      return;
    const react = (_a = opts.react) != null ? _a : skill === "good" ? 0.35 : 0.9;
    s2._botT = s2._botT || 0;
    if (s2.tut && s2.tut.active) {
      const id = TUTORIAL[s2.tut.step].id;
      const want2 = [0, 1, 2, 3].map((d) => Math.min(1, needNow(s2, d) / CAP[d]));
      if (id === "shovel" || id === "pressure") {
        if (s2.fire < 30)
          shovel(s2);
        return;
      }
      if (s2.fire < 35)
        shovel(s2);
      if (id === "hosp")
        setValve(s2, 0, want2[0]);
      if (id === "home") {
        setValve(s2, 0, want2[0]);
        setValve(s2, 1, want2[1]);
      }
      if (id === "fact") {
        setValve(s2, 2, want2[2]);
      }
      if (id === "scrub") {
        setValve(s2, 3, want2[3]);
      }
      if (id === "leak") {
        if (s2.leaks.length)
          fixLeak(s2, null);
      }
      return;
    }
    if (skill === "reckless") {
      if (s2.fire < 98)
        shovel(s2);
      for (let i = 0; i < 4; i++)
        setValve(s2, i, 0);
      if (s2.leaks.length)
        fixLeak(s2, null);
      return;
    }
    if (skill === "bad") {
      if (s2.fire < 90)
        shovel(s2);
      setValve(s2, 0, 0.2);
      setValve(s2, 1, 0.3);
      setValve(s2, 2, 1);
      setValve(s2, 3, 0);
      return;
    }
    if (s2.clock - s2._botT < react)
      return;
    s2._botT = s2.clock;
    const need = [0, 1, 2, 3].map((d) => needNow(s2, d));
    const want = need.map((n, d) => Math.min(1, n / CAP[d]));
    const aim = skill === "good" ? 1 : skill === "stingy" ? (_b = opts.aim) != null ? _b : 0.62 : 0.85;
    setValve(s2, 0, Math.min(1, want[0] * aim * 1.05));
    setValve(s2, 1, Math.min(1, want[1] * aim * 1));
    const coalLow = s2.coal < 18;
    let fact = want[2] * (coalLow ? 1 : 0.8);
    if (!opts.pusher) {
      if (s2.fw > 70)
        fact = want[2] * 0.4;
      else if (s2.fw > 55 && !coalLow)
        fact = want[2] * 0.6;
      if (s2.burnT > 0)
        fact = 0.3;
    } else
      fact = want[2] * 1.1;
    setValve(s2, 2, Math.min(1, fact));
    setValve(s2, 3, Math.min(1, want[3] * (s2.smog > 25 ? 1.3 : 1) * (skill === "good" ? 1 : 0.6)));
    if (s2.leaks.length && s2.leaks[0].age > react)
      fixLeak(s2, null);
    const target = skill === "good" ? 56 : 48;
    const flowTot = s2.flow.reduce((a, b) => a + b, 0);
    const wantFire = Math.min(80, flowTot / 0.16 + (target - s2.P) * 1.4 + 6);
    if (s2.fire < wantFire - 7 && s2.P < 80)
      shovel(s2);
  }
  function pickChoice(s2, opts) {
    const c = s2.card.id;
    const p = opts.policy || "good";
    const table = {
      good: { timka: "ration", shift: "refuse", brown: "decline", sloboda: "aid" },
      greedy: { timka: "help", shift: "extend", brown: "accept", sloboda: "keep" },
      smoky: { timka: "ration", shift: "refuse", brown: "accept", sloboda: "aid" },
      iron: { timka: "help", shift: "extend", brown: "decline", sloboda: "aid" }
    };
    return (table[p] || table.good)[c];
  }

  // src/core/validate.js
  var num = (v, lo = -Infinity, hi = Infinity) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
  var arr4 = (a, lo, hi) => Array.isArray(a) && a.length === 4 && a.every((v) => num(v, lo, hi));
  var PHASES = ["night", "summary", "card", "ended"];
  function validateSave(o) {
    if (!o || typeof o !== "object" || Array.isArray(o) || o.v !== 1)
      return null;
    if (!PHASES.includes(o.phase))
      return null;
    if (!Number.isInteger(o.night) || o.night < 0 || o.night >= NIGHTS.length)
      return null;
    if (!Number.isInteger(o.rs) || o.rs < 0 || o.rs > 4294967295)
      return null;
    const ranges = [["t", 0, 1e5], ["clock", 0, 1e7], ["P", 0, 100], ["fire", 0, 200], ["coal", 0, 99], ["smog", 0, 100], ["pop", 0, 1e3], ["fw", 0, 100], ["danger", 0, 100], ["shovelCd", 0, 100], ["burnT", 0, 100], ["burnouts", 0, 1e3]];
    for (const [k, lo, hi] of ranges)
      if (!num(o[k], lo, hi))
        return null;
    if (!arr4(o.valves, 0, 1) || !arr4(o.sat, 0, 1.0001) || !arr4(o.flow, 0, 1e4) || !arr4(o.needNow, 0, 1e4))
      return null;
    if (!Array.isArray(o.leaks) || o.leaks.length > 3 || !o.leaks.every((l) => l && Number.isInteger(l.pipe) && l.pipe >= 0 && l.pipe < 4 && num(l.age, 0, 1e5) && Number.isInteger(l.id)))
      return null;
    if (!o.flags || typeof o.flags !== "object" || Array.isArray(o.flags))
      return null;
    if (!o.choices || typeof o.choices !== "object" || Array.isArray(o.choices))
      return null;
    if (o.phase === "card" && !(o.card && typeof o.card === "object" && Array.isArray(o.card.options) && o.card.options.length > 0 && typeof o.card.id === "string"))
      return null;
    if (o.phase === "summary" && !(o.summary && typeof o.summary === "object"))
      return null;
    if (o.phase === "ended" && typeof o.ending !== "string")
      return null;
    if (o.events === void 0)
      o.events = [];
    if (o.msgs === void 0)
      o.msgs = [];
    return o;
  }
  function loadSaved(str) {
    if (typeof str !== "string" || str.length > 2e5)
      return null;
    try {
      const o = JSON.parse(str);
      if (o && typeof o === "object") {
        o.events = [];
        o.msgs = [];
      }
      return validateSave(o);
    } catch (e) {
      return null;
    }
  }

  // src/ui/keys.js
  function shouldIgnoreKey(target) {
    if (!target)
      return false;
    const tag = String(target.tagName || "").toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!target.isContentEditable;
  }

  // src/ui/coach.js
  var COACH = { WINDOW: 20, NEED: 3, COOLDOWN: 45, CAT_COOLDOWN: 90, PER_NIGHT: 3, STALL: 25, STALL_COOLDOWN: 40, RING: 7 };
  var NAMES = ["\u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044F", "\u041A\u0432\u0430\u0440\u0442\u0430\u043B\u043E\u0432", "\u0417\u0430\u0432\u043E\u0434\u0430", "\u0424\u0438\u043B\u044C\u0442\u0440\u043E\u0432"];
  var NAMES_NOM = ["\u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044C", "\u041A\u0432\u0430\u0440\u0442\u0430\u043B\u044B", "\u0417\u0430\u0432\u043E\u0434", "\u0424\u0438\u043B\u044C\u0442\u0440\u044B"];
  var HINTS = {
    valve_close: (i) => ({ text: `\u0412\u0435\u043D\u0442\u0438\u043B\u044C ${NAMES[i]} \u043F\u043E\u0447\u0442\u0438 \u0437\u0430\u043A\u0440\u044B\u0442, \u0430 \u043B\u044E\u0434\u044F\u043C \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u043F\u0430\u0440\u0430. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0435\u0433\u043E \u0434\u043E \u0437\u043E\u043B\u043E\u0442\u043E\u0439 \u043E\u0442\u043C\u0435\u0442\u043A\u0438.`, ring: "v" + i }),
    valve_open: (i) => ({ text: `${NAMES_NOM[i]} \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0430\u0440\u0430, \u0447\u0435\u043C \u043D\u0443\u0436\u043D\u043E, \u2014 \u043B\u0438\u0448\u043D\u0435\u0435 \u0443\u0445\u043E\u0434\u0438\u0442 \u0432\u043F\u0443\u0441\u0442\u0443\u044E. \u041F\u0440\u0438\u043A\u0440\u043E\u0439\u0442\u0435 \u0432\u0435\u043D\u0442\u0438\u043B\u044C \u0434\u043E \u043E\u0442\u043C\u0435\u0442\u043A\u0438.`, ring: "v" + i }),
    shovel_waste: () => ({ text: "\u0422\u043E\u043F\u043A\u0430 \u0443\u0436\u0435 \u043F\u043E\u043B\u043D\u0430 \u2014 \u0443\u0433\u043E\u043B\u044C \u0432\u044B\u0441\u044B\u043F\u0430\u0435\u0442\u0441\u044F. \u041F\u043E\u0434\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0439\u0442\u0435, \u043A\u043E\u0433\u0434\u0430 \u0436\u0430\u0440 \u043E\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F.", ring: "shovel" }),
    p_high: () => ({ text: "\u0414\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0443 \u043A\u0440\u0430\u0441\u043D\u043E\u0439 \u0447\u0435\u0440\u0442\u044B! \u041F\u0440\u0438\u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0432\u0435\u043D\u0442\u0438\u043B\u0438 \u0438 \u043D\u0435 \u043F\u043E\u0434\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0439\u0442\u0435 \u0443\u0433\u043E\u043B\u044C, \u043F\u043E\u043A\u0430 \u0441\u0442\u0440\u0435\u043B\u043A\u0430 \u043D\u0435 \u0432\u0435\u0440\u043D\u0451\u0442\u0441\u044F \u0432 \u0437\u0435\u043B\u0451\u043D\u0443\u044E \u0437\u043E\u043D\u0443.", ring: "gauge" }),
    p_low: () => ({ text: "\u0414\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0430\u0434\u0430\u0435\u0442, \u0442\u043E\u043F\u043A\u0430 \u043E\u0441\u0442\u044B\u0432\u0430\u0435\u0442 \u2014 \u043F\u043E\u0434\u0431\u0440\u043E\u0441\u044C\u0442\u0435 \u0443\u0433\u043E\u043B\u044C (\u041F\u0420\u041E\u0411\u0415\u041B).", ring: "shovel" }),
    leak: () => ({ text: "\u0423\u0442\u0435\u0447\u043A\u0430 \u043F\u0430\u0440\u0430! \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u043E\u0431\u043B\u0430\u0447\u043A\u043E \u043D\u0430\u0434 \u0442\u0440\u0443\u0431\u043E\u0439 (\u0438\u043B\u0438 F), \u0447\u0442\u043E\u0431\u044B \u0437\u0430\u0442\u043A\u043D\u0443\u0442\u044C \u0435\u0451.", ring: "leak" }),
    smog: () => ({ text: "\u0413\u043E\u0440\u043E\u0434 \u0437\u0430\u0434\u044B\u0445\u0430\u0435\u0442\u0441\u044F \u043E\u0442 \u0434\u044B\u043C\u0430. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0432\u0435\u043D\u0442\u0438\u043B\u044C \u0424\u0438\u043B\u044C\u0442\u0440\u043E\u0432 \u0434\u043E \u043E\u0442\u043C\u0435\u0442\u043A\u0438.", ring: "v3" })
  };
  var Coach = class {
    constructor(opts = {}) {
      this.o = __spreadValues(__spreadValues({}, COACH), opts);
      this.reset();
    }
    reset() {
      this.streak = [];
      this.lastHint = -1e9;
      this.catLast = {};
      this.nightCount = 0;
      this.night = -1;
      this.prev = null;
      this.sampleT = 0;
      this.cond = { p_high: 0, p_low: 0, leak: 0, smog: 0 };
      this.ringId = null;
      this.ringUntil = -1;
      this.stepKey = null;
      this.stepAt = 0;
      this.stallLast = -1e9;
      this.shown = 0;
    }
    ring(clock) {
      return clock < this.ringUntil ? this.ringId : null;
    }
    good() {
      this.streak.length = 0;
    }
    bad(clock, cat, i = 0) {
      this.streak.push({ t: clock, cat, i });
      this.streak = this.streak.filter((x) => clock - x.t <= this.o.WINDOW);
    }
    // события симуляции: 'shovel' {good}, 'spill', 'fix'
    onEvent(e, s2) {
      const c = s2.clock;
      if (e.type === "shovel") {
        if (e.good === false)
          this.bad(c, "shovel_waste");
        else if (s2.fire < 60)
          this.good();
      } else if (e.type === "spill")
        this.bad(c, "shovel_waste");
      else if (e.type === "fix")
        this.good();
    }
    // вызывать каждый шаг симуляции в фазе «ночь». Возвращает подсказку {text, ring, cat} или null.
    update(s2, dt) {
      var _a;
      const c = s2.clock;
      if (s2.night !== this.night) {
        this.night = s2.night;
        this.nightCount = 0;
        this.streak = [];
        this.prev = s2.valves.slice();
        this.sampleT = c;
        this.cond = { p_high: 0, p_low: 0, leak: 0, smog: 0 };
      }
      if (!this.prev) {
        this.prev = s2.valves.slice();
        this.sampleT = c;
      }
      if (c - this.sampleT >= 0.3) {
        for (let i = 0; i < 4; i++) {
          const d = s2.valves[i] - this.prev[i];
          if (Math.abs(d) < 0.04)
            continue;
          const m = Math.min(1, s2.needNow[i] / CAP[i]), from = this.prev[i];
          if (m <= 0.02)
            continue;
          if (d < 0 && from < m - 0.06 && s2.sat[i] < 0.85)
            this.bad(c, "valve_close", i);
          else if (d > 0 && from > m + 0.2)
            this.bad(c, "valve_open", i);
          else if (d > 0 && from < m - 0.04 || d < 0 && from > m + 0.1)
            this.good();
          this.prev[i] = s2.valves[i];
        }
        for (let i = 0; i < 4; i++)
          if (Math.abs(s2.valves[i] - this.prev[i]) < 0.04 && c - this.sampleT > 1.2)
            this.prev[i] = s2.valves[i];
        this.sampleT = c;
      }
      const cond = (k, on, period, cat) => {
        if (!on) {
          this.cond[k] = 0;
          return;
        }
        this.cond[k] += dt;
        if (this.cond[k] >= period) {
          this.cond[k] -= period;
          this.bad(c, cat, k === "smog" ? 3 : 0);
        }
      };
      cond("p_high", s2.P >= 90, 6, "p_high");
      cond("p_low", s2.P < 12 && s2.fire < 25 && s2.coal >= 1 && !(s2.tut && s2.tut.active), 8, "p_low");
      cond("leak", s2.leaks.length > 0 && !(s2.tut && s2.tut.active), 7, "leak");
      cond("smog", s2.smog > 70 && s2.valves[3] < Math.min(1, s2.needNow[3] / CAP[3]) - 0.1, 8, "smog");
      this.streak = this.streak.filter((x) => c - x.t <= this.o.WINDOW);
      if (this.streak.length >= this.o.NEED && c - this.lastHint >= this.o.COOLDOWN && this.nightCount < this.o.PER_NIGHT) {
        const last2 = this.streak[this.streak.length - 1];
        if (c - ((_a = this.catLast[last2.cat + last2.i]) != null ? _a : -1e9) >= this.o.CAT_COOLDOWN)
          return this.fire(c, last2.cat, last2.i);
      }
      if (s2.tut && s2.tut.active) {
        const step2 = s2.tut.step;
        if (this.stepKey !== step2) {
          this.stepKey = step2;
          this.stepAt = c;
        }
        if (c - this.stepAt >= this.o.STALL && c - this.stallLast >= this.o.STALL_COOLDOWN && c - this.lastHint >= 8) {
          const T = TUTORIAL[step2];
          this.stallLast = c;
          if (T && T.hint)
            return this.fire(c, "stall", 0, { text: T.text, ring: T.hint }, true);
        }
      }
      return null;
    }
    fire(c, cat, i, custom, noCount) {
      const h = custom || HINTS[cat](i);
      this.lastHint = c;
      this.catLast[cat + i] = c;
      if (!noCount) {
        this.nightCount++;
        this.streak = [];
      }
      this.ringId = h.ring;
      this.ringUntil = c + this.o.RING;
      this.shown++;
      return { text: h.text, ring: h.ring, cat };
    }
  };

  // src/ui/notes.js
  var NOTES = {
    FIRST: 45,
    // не раньше чем через 45 с после начала ночи
    QUIET_HINT: 15,
    // тишина после подсказки тренера
    QUIET_ALARM: 12,
    // и после аварийных событий (утечка, падение, сброс)
    DEFAULT_GAP: 150,
    MIN_GAP: 60,
    MAX_GAP: 900,
    // интервал между заметками (сервер может задать свой через next_s)
    PER_NIGHT: 3,
    MAX_PER_NIGHT: 6,
    RETRY: 60,
    // после ошибки сети/лимита — не раньше чем через минуту
    SHOW: 14,
    // сколько секунд заметка висит в панели
    FAILS_OFF: 4
    // после стольких сбоев подряд до конца ночи не спрашиваем
  };
  function isCrisis(s2) {
    return s2.leaks.length > 0 || s2.P >= 85 || s2.P < 12 && s2.fire < 25 || s2.danger > 0 || s2.burnT > 0 || s2.venting;
  }
  var Notes = class {
    constructor(opts = {}) {
      this.o = __spreadValues(__spreadValues({}, NOTES), opts);
      this.reset();
    }
    reset() {
      this.t = 0;
      this.night = -1;
      this.nightT = 0;
      this.count = 0;
      this.nextAt = 0;
      this.busy = false;
      this.enabled = true;
      this.gap = this.o.DEFAULT_GAP;
      this.perNight = this.o.PER_NIGHT;
      this.fails = 0;
      this.lastHint = -1e9;
      this.lastAlarm = -1e9;
      this.ev = {};
      this.shown = 0;
      this.token = 0;
    }
    noteHint() {
      this.lastHint = this.t;
    }
    onEvent(e) {
      const t = this.t;
      if (e.type === "leak" || e.type === "spill" || e.type === "collapse" || e.type === "vent")
        this.lastAlarm = t;
      if (e.type === "fix")
        this.ev.leak = t;
      if (e.type === "collapse")
        this.ev.collapse = t;
      if (e.type === "loss")
        this.ev.loss = t;
      if (e.type === "vent")
        this.ev.vent = t;
    }
    // Какую ситуацию описать (null — сейчас не время).
    situation(s2) {
      if (isCrisis(s2))
        return null;
      const t = this.t, recent = (k, w) => this.ev[k] != null && t - this.ev[k] <= w;
      if (recent("collapse", 60))
        return "collapse";
      if (recent("loss", 40))
        return "pop_loss";
      if (recent("vent", 40) || s2.P > P_GREEN[1])
        return "pressure_high";
      if (recent("leak", 30))
        return "leak";
      if (s2.coal < 18)
        return "coal_low";
      if (s2.smog > 60)
        return "smog_high";
      if (this.nightT < 100)
        return "night_start";
      return "calm";
    }
    // Вызывать каждый шаг в фазе «ночь». Возвращает {s: ситуация, n: ночь} если пора запросить заметку, иначе null.
    update(s2, dt) {
      if (s2.phase !== "night")
        return null;
      if (s2.night !== this.night) {
        this.night = s2.night;
        this.nightT = 0;
        this.count = 0;
        this.fails = 0;
        this.nextAt = Math.max(this.nextAt, this.t + this.o.FIRST);
      }
      this.t += dt;
      this.nightT += dt;
      if (!this.enabled || this.busy || this.count >= this.perNight || this.fails >= this.o.FAILS_OFF)
        return null;
      if (s2.tut && s2.tut.active)
        return null;
      if (this.nightT < this.o.FIRST || this.t < this.nextAt)
        return null;
      if (this.t - this.lastHint < this.o.QUIET_HINT || this.t - this.lastAlarm < this.o.QUIET_ALARM)
        return null;
      const sit = this.situation(s2);
      if (!sit)
        return null;
      this.busy = true;
      this.token++;
      return { s: sit, n: Math.max(1, Math.min(10, (s2.night | 0) + 1)), token: this.token };
    }
    // Ответ сервера (r — результат net.call). Возвращает текст для показа или null.
    accept(r, req, s2) {
      if (!req || req.token !== this.token)
        return null;
      this.busy = false;
      const d = r && r.ok && r.data;
      if (!d || typeof d !== "object") {
        this.fails++;
        this.nextAt = this.t + this.o.RETRY;
        return null;
      }
      if (d.enabled === false) {
        this.enabled = false;
        return null;
      }
      this.fails = 0;
      const num2 = (v, lo, hi, def) => typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def;
      this.gap = num2(d.next_s, this.o.MIN_GAP, this.o.MAX_GAP, this.o.DEFAULT_GAP);
      this.perNight = Math.round(num2(d.per_night, 1, this.o.MAX_PER_NIGHT, this.o.PER_NIGHT));
      const text2 = typeof d.note === "string" ? d.note.trim() : "";
      if (!text2 || text2.length > 300) {
        this.nextAt = this.t + num2(d.retry_s, 10, 300, this.o.RETRY);
        return null;
      }
      if (s2 && (s2.phase !== "night" || isCrisis(s2) || this.t - this.lastHint < 5)) {
        this.nextAt = this.t + 20;
        return null;
      }
      this.count++;
      this.shown++;
      this.nextAt = this.t + this.gap;
      return text2;
    }
    fail() {
      this.busy = false;
      this.fails++;
      this.nextAt = this.t + this.o.RETRY;
    }
  };

  // src/net/net.js
  var BASE = "https://185-255-133-179.sslip.io/steam/api/g" ? "https://185-255-133-179.sslip.io/steam/api/g".replace(/\/+$/, "") : "/api/g";
  var TIMEOUT = 3e3;
  function call(path, body, opts = {}) {
    if (typeof fetch !== "function")
      return Promise.resolve(null);
    const limit = Math.min(opts.timeout || TIMEOUT, opts.cap || TIMEOUT);
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    let timer = 0;
    const deadline = new Promise((res) => {
      timer = setTimeout(() => {
        try {
          if (ctl)
            ctl.abort();
        } catch (e) {
        }
        res(null);
      }, limit);
    });
    const req = (async () => {
      try {
        const r = await fetch(BASE + path, {
          method: body === void 0 ? "GET" : "POST",
          signal: ctl ? ctl.signal : void 0,
          cache: "no-store",
          credentials: "omit",
          keepalive: !!opts.keepalive,
          headers: body === void 0 ? void 0 : { "content-type": "application/json" },
          body: body === void 0 ? void 0 : JSON.stringify(body)
        });
        let j = null;
        try {
          j = await r.json();
        } catch (e) {
        }
        return { ok: r.ok, status: r.status, data: j };
      } catch (e) {
        return null;
      }
    })();
    return Promise.race([req, deadline]).then((v) => {
      clearTimeout(timer);
      return v;
    }, () => {
      clearTimeout(timer);
      return null;
    });
  }
  function deviceInfo(nav = typeof navigator !== "undefined" ? navigator : {}, scr = typeof screen !== "undefined" ? screen : {}, win = typeof window !== "undefined" ? window : {}) {
    const ua = nav.userAgent || "";
    const platform = /Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) || /Macintosh/i.test(ua) && nav.maxTouchPoints > 1 ? "ios" : /Windows/i.test(ua) ? "windows" : /Macintosh|Mac OS/i.test(ua) ? "mac" : /Linux|X11|CrOS/i.test(ua) ? "linux" : "other";
    const m = ua.match(/(Edg|OPR|Firefox|FxiOS|CriOS|SamsungBrowser|Chrome|Version)\/(\d+)/);
    const names = { Edg: "Edge", OPR: "Opera", FxiOS: "Firefox", CriOS: "Chrome", Version: "Safari" };
    const browser = m ? `${names[m[1]] || m[1]}/${m[2]}` : /Safari/.test(ua) ? "Safari" : "other";
    const sw = Math.round(win.innerWidth || scr.width || 0), sh = Math.round(win.innerHeight || scr.height || 0);
    return { platform, sw, sh, touch: !!(nav.maxTouchPoints > 0), ua: `${browser} ${platform}` };
  }
  var Run = class {
    constructor(enabled) {
      this.enabled = enabled;
      this.token = null;
      this.sent = 0;
      this.pending = null;
    }
    async begin() {
      this.token = null;
      this.pending = call("/run", {}).then((r) => {
        this.token = r && r.ok && r.data && r.data.token ? r.data.token : null;
        return this.token;
      });
      return this.pending;
    }
    get online() {
      return !!this.token;
    }
    async event(type, data) {
      if (!this.enabled())
        return false;
      if (this.pending)
        await this.pending;
      if (!this.token)
        return false;
      const r = await call("/event", { token: this.token, type, data }, { keepalive: true });
      if (r && r.ok) {
        this.sent++;
        return true;
      }
      return false;
    }
    async submitDaily(result, nick, pid, day) {
      if (this.pending)
        await this.pending;
      if (!this.token)
        return null;
      return call("/daily/score", __spreadValues({ token: this.token, pid, nick, day }, result));
    }
    async submit(result, nick, pid) {
      if (this.pending)
        await this.pending;
      if (!this.token)
        return null;
      return call("/score", __spreadValues({ token: this.token, pid, nick }, result));
    }
  };
  async function fetchBoard(board) {
    const r = await call("/leaderboard?board=" + encodeURIComponent(board) + "&limit=20");
    return r && r.ok && r.data && Array.isArray(r.data.entries) ? r.data.entries : null;
  }
  function randomId() {
    const a = new Uint8Array(12);
    if (typeof crypto !== "undefined" && crypto.getRandomValues)
      crypto.getRandomValues(a);
    else
      for (let i = 0; i < a.length; i++)
        a[i] = Math.random() * 256;
    return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function fetchDaily() {
    const r = await call("/daily");
    return r && r.ok && r.data && typeof r.data.seed === "number" && r.data.quest ? r.data : null;
  }
  async function fetchDailyBoard(day, pid) {
    const r = await call("/daily/board?limit=20" + (day ? "&day=" + encodeURIComponent(day) : "") + (pid ? "&pid=" + encodeURIComponent(pid) : ""));
    return r && r.ok && r.data && Array.isArray(r.data.entries) ? r.data : null;
  }
  async function fetchSeason(pid) {
    const r = await call("/leaderboard?board=season&limit=20" + (pid ? "&pid=" + encodeURIComponent(pid) : ""));
    return r && r.ok && r.data && Array.isArray(r.data.entries) ? r.data : null;
  }
  async function fetchReview(agg) {
    const r = await call("/review", agg, { cap: 12e3, timeout: 12e3 });
    return r && r.ok && r.data && r.data.enabled && typeof r.data.text === "string" ? { text: r.data.text, src: r.data.src } : null;
  }

  // src/core/achievements.js
  var FULL = ["light", "smoke", "iron", "cold"];
  var full = (c) => FULL.includes(c.ending) && c.nights >= 10;
  var ACHIEVEMENTS = [
    { id: "first_dawn", name: "\u041F\u0435\u0440\u0432\u044B\u0439 \u0440\u0430\u0441\u0441\u0432\u0435\u0442", desc: "\u041F\u0435\u0440\u0435\u0436\u0438\u0432\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u0443 \u043D\u043E\u0447\u044C.", icon: "sun", tier: 1, test: (c) => c.nights >= 1 },
    { id: "half_way", name: "\u041F\u043E\u043B\u043F\u0443\u0442\u0438", desc: "\u0414\u043E\u0436\u0438\u0432\u0438\u0442\u0435 \u0434\u043E \u0448\u0435\u0441\u0442\u043E\u0439 \u043D\u043E\u0447\u0438.", icon: "moon", tier: 1, test: (c) => c.nights >= 5 },
    { id: "convoy", name: "\u041E\u0431\u043E\u0437 \u043F\u0440\u0438\u0448\u0451\u043B", desc: "\u041F\u0435\u0440\u0435\u0436\u0438\u0432\u0438\u0442\u0435 \u0432\u0441\u0435 \u0434\u0435\u0441\u044F\u0442\u044C \u043D\u043E\u0447\u0435\u0439.", icon: "flag", tier: 2, test: full },
    { id: "light", name: "\u0421\u0432\u0435\u0442\u043B\u0430\u044F \u0437\u0438\u043C\u0430", desc: "\u0414\u043E\u0431\u0435\u0439\u0442\u0435\u0441\u044C \u0441\u0432\u0435\u0442\u043B\u043E\u0439 \u043A\u043E\u043D\u0446\u043E\u0432\u043A\u0438.", icon: "star", tier: 3, test: (c) => c.ending === "light" },
    { id: "smoke_end", name: "\u0414\u044B\u043C\u043D\u0430\u044F \u043F\u0440\u0430\u0432\u0434\u0430", desc: "\u0423\u0432\u0438\u0434\u044C\u0442\u0435 \u043A\u043E\u043D\u0446\u043E\u0432\u043A\u0443 \xAB\u0433\u043E\u0440\u043E\u0434 \u0432 \u0434\u044B\u043C\u0443\xBB.", icon: "cloud", tier: 1, test: (c) => c.ending === "smoke" },
    { id: "iron_end", name: "\u0416\u0435\u043B\u0435\u0437\u043D\u0430\u044F \u0446\u0435\u043D\u0430", desc: "\u0423\u0432\u0438\u0434\u044C\u0442\u0435 \u043A\u043E\u043D\u0446\u043E\u0432\u043A\u0443 \xAB\u0436\u0435\u043B\u0435\u0437\u043D\u0430\u044F \u0446\u0435\u043D\u0430\xBB.", icon: "gear", tier: 1, test: (c) => c.ending === "iron" },
    { id: "cold_end", name: "\u0425\u043E\u043B\u043E\u0434\u043D\u0430\u044F \u0437\u0438\u043C\u0430", desc: "\u0414\u043E\u0439\u0434\u0438\u0442\u0435 \u0434\u043E \u043E\u0431\u043E\u0437\u0430, \u043F\u043E\u0442\u0435\u0440\u044F\u0432 \u043F\u043E\u0447\u0442\u0438 \u0432\u0435\u0441\u044C \u0433\u043E\u0440\u043E\u0434.", icon: "snow", tier: 1, test: (c) => c.ending === "cold" },
    { id: "boom", name: "\u0411\u0430\u0431\u0430\u0445", desc: "\u0412\u0437\u043E\u0440\u0432\u0438\u0442\u0435 \u0410\u0433\u0430\u0444\u044C\u044E. \u0411\u044B\u0432\u0430\u0435\u0442.", icon: "skull", tier: 1, test: (c) => c.ending === "boom" },
    { id: "silence", name: "\u0422\u0438\u0448\u0438\u043D\u0430", desc: "\u0414\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C, \u043F\u043E\u043A\u0430 \u0432 \u0433\u043E\u0440\u043E\u0434\u0435 \u043F\u043E\u0433\u0430\u0441\u043D\u0443\u0442 \u043E\u0433\u043D\u0438.", icon: "moon", tier: 1, test: (c) => c.ending === "silence" },
    { id: "all_endings", name: "\u0412\u0441\u0435 \u0441\u0443\u0434\u044C\u0431\u044B", desc: "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0432\u0441\u0435 \u0448\u0435\u0441\u0442\u044C \u043A\u043E\u043D\u0446\u043E\u0432\u043E\u043A.", icon: "book", tier: 3, test: (c, m) => (/* @__PURE__ */ new Set([...m ? m.endings : [], c.ending])).size >= 6 },
    { id: "clean_shift", name: "\u0411\u0435\u0437 \u043F\u0430\u0434\u0435\u043D\u0438\u0439", desc: "\u041F\u0440\u043E\u0439\u0434\u0438\u0442\u0435 \u0438\u0433\u0440\u0443, \u043D\u0438 \u0440\u0430\u0437\u0443 \u043D\u0435 \u0443\u0440\u043E\u043D\u0438\u0432 \u0441\u043C\u0435\u043D\u0443.", icon: "shield", tier: 2, test: (c) => full(c) && c.burnouts === 0 },
    { id: "clean_sky", name: "\u0427\u0438\u0441\u0442\u043E\u0435 \u043D\u0435\u0431\u043E", desc: "\u041F\u0440\u043E\u0439\u0434\u0438\u0442\u0435 \u0438\u0433\u0440\u0443 \u0441\u043E \u0441\u0440\u0435\u0434\u043D\u0438\u043C \u0434\u044B\u043C\u043E\u043C \u043D\u0435 \u0432\u044B\u0448\u0435 20%.", icon: "cloud", tier: 2, test: (c) => full(c) && c.smog <= 20 },
    { id: "hospital_hero", name: "\u0425\u0440\u0430\u043D\u0438\u0442\u0435\u043B\u044C \u0433\u043E\u0440\u043E\u0434\u0430", desc: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 900 \u0436\u0438\u0442\u0435\u043B\u0435\u0439.", icon: "heart", tier: 2, test: (c) => full(c) && c.pop >= 900 },
    { id: "every_one", name: "\u041A\u0430\u0436\u0434\u044B\u0439 \u043D\u0430 \u0441\u0447\u0435\u0442\u0443", desc: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 950 \u0436\u0438\u0442\u0435\u043B\u0435\u0439.", icon: "heart", tier: 3, test: (c) => full(c) && c.pop >= 950 },
    { id: "plumber", name: "\u0412\u043E\u0434\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0447\u0438\u043A", desc: "\u0417\u0430\u0434\u0435\u043B\u0430\u0439\u0442\u0435 15 \u0443\u0442\u0435\u0447\u0435\u043A \u0437\u0430 \u043E\u0434\u043D\u0443 \u043F\u0430\u0440\u0442\u0438\u044E.", icon: "wrench", tier: 2, test: (c) => (c.leaksFixed || 0) >= 15 },
    { id: "coal_baron", name: "\u0423\u0433\u043E\u043B\u044C\u043D\u044B\u0439 \u0431\u0430\u0440\u043E\u043D", desc: "\u0411\u0440\u043E\u0441\u044C\u0442\u0435 200 \u043B\u043E\u043F\u0430\u0442 \u0443\u0433\u043B\u044F \u0437\u0430 \u043E\u0434\u043D\u0443 \u043F\u0430\u0440\u0442\u0438\u044E.", icon: "flame", tier: 2, test: (c) => (c.shovels || 0) >= 200 },
    { id: "no_spill", name: "\u041D\u0438 \u043A\u0440\u043E\u0448\u043A\u0438 \u043C\u0438\u043C\u043E", desc: "\u041F\u0440\u043E\u0439\u0434\u0438\u0442\u0435 \u0438\u0433\u0440\u0443, \u043D\u0438 \u0440\u0430\u0437\u0443 \u043D\u0435 \u043F\u0435\u0440\u0435\u0441\u044B\u043F\u0430\u0432 \u0442\u043E\u043F\u043A\u0443.", icon: "drop", tier: 2, test: (c) => full(c) && c.spills === 0 },
    { id: "master", name: "\u041C\u0430\u0441\u0442\u0435\u0440 \u043A\u043E\u0442\u043B\u0430", desc: "\u041D\u0430\u0431\u0435\u0440\u0438\u0442\u0435 1500 \u043E\u0447\u043A\u043E\u0432.", icon: "crown", tier: 2, test: (c) => c.score >= 1500 },
    { id: "legend", name: "\u041B\u0435\u0433\u0435\u043D\u0434\u0430 \u0424\u0435\u0440\u0440\u043E\u0433\u0440\u0430\u0434\u0430", desc: "\u041D\u0430\u0431\u0435\u0440\u0438\u0442\u0435 1700 \u043E\u0447\u043A\u043E\u0432.", icon: "crown", tier: 3, test: (c) => c.score >= 1700 },
    { id: "team", name: "\u041E\u0434\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430", desc: "\u0414\u043E\u0439\u0434\u0438\u0442\u0435 \u0434\u043E \u043E\u0431\u043E\u0437\u0430 \u0432 \u043A\u043E\u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u0435.", icon: "hands", tier: 2, test: (c) => c.mode === "coop" && full(c) },
    { id: "coop_light", name: "\u0414\u0440\u0443\u0436\u043D\u0430\u044F \u0437\u0438\u043C\u0430", desc: "\u0421\u0432\u0435\u0442\u043B\u0430\u044F \u043A\u043E\u043D\u0446\u043E\u0432\u043A\u0430 \u0432 \u043A\u043E\u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u0435.", icon: "star", tier: 3, test: (c) => c.mode === "coop" && c.ending === "light" },
    { id: "rival", name: "\u0421\u043E\u043F\u0435\u0440\u043D\u0438\u043A", desc: "\u0421\u044B\u0433\u0440\u0430\u0439\u0442\u0435 \u0432 \u0441\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u043D\u0438\u0438.", icon: "bolt", tier: 1, test: (c) => c.mode === "versus" },
    { id: "champion", name: "\u0427\u0435\u043C\u043F\u0438\u043E\u043D \u043A\u043E\u0442\u0435\u043B\u044C\u043D\u043E\u0439", desc: "\u0417\u0430\u0439\u043C\u0438\u0442\u0435 \u043F\u0435\u0440\u0432\u043E\u0435 \u043C\u0435\u0441\u0442\u043E \u0432 \u0441\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u043D\u0438\u0438.", icon: "trophy", tier: 3, test: (c) => c.mode === "versus" && c.place === 1 && (c.players || 0) >= 2 && !c.dnf },
    { id: "quartet", name: "\u0427\u0435\u0442\u0432\u0451\u0440\u043A\u0430", desc: "\u0421\u044B\u0433\u0440\u0430\u0439\u0442\u0435 \u0441\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u043D\u0438\u0435 \u0432\u0447\u0435\u0442\u0432\u0435\u0440\u043E\u043C.", icon: "hands", tier: 2, test: (c) => c.mode === "versus" && (c.players || 0) >= 4 },
    { id: "daily_first", name: "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u0434\u043D\u044F", desc: "\u0412\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0441\u044E\u0436\u0435\u0442\u043D\u043E\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u0435 \u0434\u043D\u044F.", icon: "scroll", tier: 2, test: (c) => c.mode === "daily" && !!c.questDone },
    { id: "streak3", name: "\u0422\u0440\u0438 \u0434\u043D\u044F \u043F\u043E\u0434\u0440\u044F\u0434", desc: "\u0418\u0433\u0440\u0430\u0439\u0442\u0435 \u0438\u0441\u043F\u044B\u0442\u0430\u043D\u0438\u0435 \u0434\u043D\u044F \u0442\u0440\u0438 \u0434\u043D\u044F \u043F\u043E\u0434\u0440\u044F\u0434.", icon: "clock", tier: 2, test: (c, m) => !!m && m.st.streak >= 3 },
    { id: "streak7", name: "\u041D\u0435\u0434\u0435\u043B\u044F \u0443 \u043A\u043E\u0442\u043B\u0430", desc: "\u0418\u0433\u0440\u0430\u0439\u0442\u0435 \u0438\u0441\u043F\u044B\u0442\u0430\u043D\u0438\u0435 \u0434\u043D\u044F \u0441\u0435\u043C\u044C \u0434\u043D\u0435\u0439 \u043F\u043E\u0434\u0440\u044F\u0434.", icon: "clock", tier: 3, test: (c, m) => !!m && m.st.streak >= 7 },
    { id: "challenger", name: "\u0412\u044B\u0437\u043E\u0432 \u043F\u0440\u0438\u043D\u044F\u0442", desc: "\u0421\u044B\u0433\u0440\u0430\u0439\u0442\u0435 \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435-\u0432\u044B\u0437\u043E\u0432\u0443 \u0434\u0440\u0443\u0433\u0430.", icon: "flag", tier: 1, test: (c) => c.mode === "challenge" },
    { id: "sharer", name: "\u0420\u0430\u0441\u0441\u043A\u0430\u0437\u0430\u043B \u0434\u0440\u0443\u0437\u044C\u044F\u043C", desc: "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u0435\u0441\u044C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u043C.", icon: "mail", tier: 1, test: (c, m) => !!m && m.st.shares >= 1 },
    { id: "veteran", name: "\u0421\u0442\u0430\u0440\u044B\u0439 \u043A\u043E\u0447\u0435\u0433\u0430\u0440", desc: "\u0421\u044B\u0433\u0440\u0430\u0439\u0442\u0435 \u0434\u0435\u0441\u044F\u0442\u044C \u043F\u0430\u0440\u0442\u0438\u0439.", icon: "key", tier: 2, test: (c, m) => !!m && m.plays >= 10 }
  ];
  function emptyStats() {
    return { coop: 0, versus: 0, wins: 0, dailyDone: 0, streak: 0, lastDay: "", shares: 0, challenges: 0, leaks: 0, shovels: 0 };
  }
  function cleanMeta(raw) {
    const o = raw && typeof raw === "object" ? raw : {};
    const st = emptyStats(), rs = o.st && typeof o.st === "object" ? o.st : {};
    for (const k of Object.keys(st))
      if (k !== "lastDay")
        st[k] = Number.isFinite(rs[k]) ? Math.max(0, Math.min(1e6, Math.floor(rs[k]))) : 0;
    st.lastDay = typeof rs.lastDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rs.lastDay) ? rs.lastDay : "";
    const ach = {};
    if (o.ach && typeof o.ach === "object") {
      for (const a of ACHIEVEMENTS)
        if (Number.isFinite(o.ach[a.id]))
          ach[a.id] = o.ach[a.id];
    }
    const endings = Array.isArray(o.endings) ? o.endings.filter(
      /** @param {any} e */
      (e) => typeof e === "string"
    ).slice(0, 12) : [];
    return { plays: Number.isFinite(o.plays) ? Math.max(0, Math.floor(o.plays)) : 0, endings, ach, st };
  }
  function prevDay(day) {
    const d = /* @__PURE__ */ new Date(day + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  function applyRun(meta2, ctx2, opt = {}) {
    var _a;
    const st = meta2.st;
    if (ctx2.mode === "coop")
      st.coop++;
    if (ctx2.mode === "versus") {
      st.versus++;
      if (ctx2.place === 1 && !ctx2.dnf && (ctx2.players || 0) >= 2)
        st.wins++;
    }
    if (ctx2.mode === "challenge")
      st.challenges++;
    if (ctx2.mode === "daily" && opt.day) {
      if (st.lastDay !== opt.day) {
        st.streak = st.lastDay === prevDay(opt.day) ? st.streak + 1 : 1;
        st.lastDay = opt.day;
      }
      if (ctx2.questDone)
        st.dailyDone++;
    }
    st.leaks += ctx2.leaksFixed || 0;
    st.shovels += ctx2.shovels || 0;
    const now = (_a = opt.now) != null ? _a : Date.now();
    const fresh = [];
    for (const a of ACHIEVEMENTS) {
      if (meta2.ach[a.id])
        continue;
      let ok = false;
      try {
        ok = !!a.test(ctx2, meta2);
      } catch (e) {
        ok = false;
      }
      if (ok) {
        meta2.ach[a.id] = now;
        fresh.push(a);
      }
    }
    return fresh;
  }
  function applyShare(meta2, now = Date.now()) {
    meta2.st.shares++;
    const a = ACHIEVEMENTS.find((x) => x.id === "sharer");
    if (a && !meta2.ach[a.id]) {
      meta2.ach[a.id] = now;
      return [a];
    }
    return [];
  }
  function questDone(goal, r) {
    if (!goal || typeof goal !== "object")
      return false;
    if ("pop_min" in goal && r.pop < goal.pop_min)
      return false;
    if ("burn_max" in goal && r.burnouts > goal.burn_max)
      return false;
    if ("smog_max" in goal && r.smog > goal.smog_max)
      return false;
    if ("nights_min" in goal && r.nights < goal.nights_min)
      return false;
    if ("ending" in goal && r.ending !== goal.ending)
      return false;
    if ("score_min" in goal && r.score < goal.score_min)
      return false;
    return true;
  }

  // src/ui/icons.js
  var G = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    moon: '<path d="M16 4a8 8 0 1 0 4 14 7 7 0 0 1-4-14z"/><path d="M18 5v3M16.5 6.5h3"/>',
    flag: '<path d="M6 21V4M6 5h11l-2.5 3.5L17 12H6"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.9A5.5 5.5 0 0 0 7 9.5 4.3 4.3 0 0 0 7 18z"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.6M12 18.4V21M3 12h2.6M18.4 12H21M5.6 5.6l1.9 1.9M16.5 16.5l1.9 1.9M18.4 5.6l-1.9 1.9M7.5 16.5l-1.9 1.9"/><circle cx="12" cy="12" r="6.6"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>',
    skull: '<path d="M6 11a6 6 0 1 1 12 0c0 2-.8 3-2 3.8V18H8v-3.2C6.8 14 6 13 6 11z"/><circle cx="9.5" cy="11" r="1.2"/><circle cx="14.5" cy="11" r="1.2"/><path d="M10.5 18v-2M13.5 18v-2"/>',
    book: '<path d="M5 5.5C7.5 4.5 10 4.7 12 6c2-1.3 4.5-1.5 7-.5V19c-2.5-1-5-.8-7 .5-2-1.3-4.5-1.5-7-.5z"/><path d="M12 6v13.5"/>',
    shield: '<path d="M12 3.5l7 2.6V12c0 4-3 7-7 8.5C8 19 5 16 5 12V6.1z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>',
    heart: '<path d="M12 19.5C5.5 15 3.8 11.8 3.8 9a4.2 4.2 0 0 1 8.2-1.2A4.2 4.2 0 0 1 20.2 9c0 2.8-1.7 6-8.2 10.5z"/>',
    wrench: '<path d="M14.5 4.5a4.5 4.5 0 0 0-4.2 6.2L4 17l3 3 6.3-6.3a4.5 4.5 0 0 0 6.2-4.2l-3 2-2.5-.5-.5-2.5z"/>',
    flame: '<path d="M12 3c.5 3-3.5 5-3.5 9a3.5 3.5 0 0 0 7 0c0-1.5-.7-2.4-1.5-3.4.4 2-1 2.6-1 2.6.8-3-.2-5.6-1-8.2z"/><path d="M12 21a5.5 5.5 0 0 0 5.5-5.5C17.5 12 15 10 14 8"/>',
    drop: '<path d="M12 3.5c3.6 4.3 5.6 7.2 5.6 10a5.6 5.6 0 0 1-11.2 0c0-2.8 2-5.7 5.6-10z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.4 2.4"/>',
    crown: '<path d="M4 17.5l1.6-9 4.4 4 2-6 2 6 4.4-4 1.6 9z"/><path d="M4.5 20h15"/>',
    hands: '<path d="M3.5 12.5l4-4 3 1 3-2 2.5 2L20.5 12l-3.8 4.4-3.2.9-3.5-1.4-2.5-.2z"/><path d="M8 11.5l3 3M12.5 9.5l2.5 3"/>',
    bolt: '<path d="M13.2 3L5.5 13.2h5.3L10 21l8-10.5h-5.3z"/>',
    trophy: '<path d="M7 4h10v4.5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5c0 3 1.2 4.6 3 5M17 5.5h2.5c0 3-1.2 4.6-3 5M12 13.5V17M8.5 20.5h7M9.5 17h5l.5 3.5h-6z"/>',
    scroll: '<path d="M7 4.5h10.5v13a2.5 2.5 0 0 1-2.5 2.5H6.5a2.5 2.5 0 0 0 2.5-2.5V6.5A2 2 0 0 0 7 4.5z"/><path d="M10 8.5h5M10 11.5h5M10 14.5h3"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    mail: '<rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M4.5 7l7.5 6 7.5-6"/>',
    key: '<circle cx="8.5" cy="12" r="3.5"/><path d="M12 12h8.5M17 12v3M20.5 12v2.5"/>'
  };
  var GLYPHS = Object.keys(G);
  var TIER = { 1: ["#a9733b", "#5a3a1a"], 2: ["#d6ac4a", "#6a4a14"], 3: ["#f4dc86", "#8a6418"] };
  function badge(glyph, tier = 2, locked = false) {
    const g = G[glyph] || G.star, [hi, lo] = TIER[tier] || TIER[2];
    const ring = locked ? "#59504a" : hi, ring2 = locked ? "#2d2824" : lo, ink = locked ? "#7c726a" : "#f6ead0";
    return `<svg class="ach-ic" viewBox="0 0 48 48" width="48" height="48" role="img" aria-hidden="true" focusable="false"><defs><linearGradient id="bg${tier}${locked ? "l" : ""}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ring}"/><stop offset="1" stop-color="${ring2}"/></linearGradient></defs><circle cx="24" cy="24" r="22" fill="url(#bg${tier}${locked ? "l" : ""})" stroke="#1a120b" stroke-width="2"/><circle cx="24" cy="24" r="17" fill="#1d1510" stroke="${ring2}" stroke-width="1.5"/><g transform="translate(10.5 10.5) scale(1.125)" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${g}</g><g fill="${ring}" opacity="${locked ? 0.4 : 0.9}"><circle cx="24" cy="4.6" r="1.2"/><circle cx="24" cy="43.4" r="1.2"/><circle cx="4.6" cy="24" r="1.2"/><circle cx="43.4" cy="24" r="1.2"/></g></svg>`;
  }

  // src/ui/share.js
  var SEED_RE = /^[1-9]\d{0,9}$/;
  function challengeFromSearch(search) {
    const p = new URLSearchParams(search);
    if (p.has("daily"))
      return { kind: "daily" };
    const seed = p.get("seed");
    if (!seed || !SEED_RE.test(seed) || +seed >= 2 ** 32)
      return null;
    const c = p.get("c");
    const score = c && /^\d{1,4}$/.test(c) ? Math.min(3e3, +c) : 0;
    return { kind: "seed", seed: +seed, score };
  }
  function challengeLink(loc, seed, score) {
    return `${loc.origin}${loc.pathname}?seed=${seed >>> 0}${score > 0 ? "&c=" + Math.min(3e3, Math.round(score)) : ""}`;
  }
  function dailyLink(loc) {
    return `${loc.origin}${loc.pathname}?daily`;
  }
  function shareText(r) {
    const base = r.mode === "daily" ? `\u0418\u0441\u043F\u044B\u0442\u0430\u043D\u0438\u0435 \u0434\u043D\u044F \u0432 \xAB\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u043C \u043A\u043E\u0442\u043B\u0435\xBB: ${r.score} \u043E\u0447\u043A\u043E\u0432.` : `\xAB\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043A\u043E\u0442\u0451\u043B\xBB: ${r.score} \u043E\u0447\u043A\u043E\u0432, ${r.nights} \u043D\u043E\u0447\u0435\u0439, ${r.pop} \u0436\u0438\u0442\u0435\u043B\u0435\u0439.`;
    return base + " \u041F\u043E\u0431\u044C\u0451\u0442\u0435?";
  }
  function drawShareCard(canvas2, data) {
    const W = 1200, H = 630;
    canvas2.width = W;
    canvas2.height = H;
    const c = canvas2.getContext("2d");
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a1d14");
    g.addColorStop(1, "#0f0a07");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.strokeStyle = "#c9a24a";
    c.lineWidth = 8;
    c.strokeRect(24, 24, W - 48, H - 48);
    c.strokeStyle = "#6a4a14";
    c.lineWidth = 2;
    c.strokeRect(40, 40, W - 80, H - 80);
    c.save();
    c.translate(180, 200);
    c.fillStyle = "#c9a24a";
    c.beginPath();
    c.arc(0, 0, 96, 0, 7);
    c.fill();
    c.fillStyle = "#f1e6c8";
    c.beginPath();
    c.arc(0, 0, 76, 0, 7);
    c.fill();
    c.strokeStyle = "#7a1f12";
    c.lineWidth = 10;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(48, -50);
    c.stroke();
    c.fillStyle = "#2a2119";
    c.beginPath();
    c.arc(0, 0, 10, 0, 7);
    c.fill();
    c.restore();
    c.fillStyle = "#f1e6c8";
    c.font = "bold 64px Georgia, serif";
    c.textBaseline = "alphabetic";
    c.fillText("\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043A\u043E\u0442\u0451\u043B", 330, 190);
    c.fillStyle = "#c9a24a";
    c.font = "30px Georgia, serif";
    c.fillText(data.mode === "daily" ? "\u0418\u0441\u043F\u044B\u0442\u0430\u043D\u0438\u0435 \u0434\u043D\u044F" : data.mode === "versus" ? "\u0421\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u043D\u0438\u0435" : data.mode === "coop" ? "\u041A\u043E\u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432" : "\u0414\u0435\u0441\u044F\u0442\u044C \u043D\u043E\u0447\u0435\u0439 \u0437\u0438\u043C\u044B", 332, 240);
    c.fillStyle = "#ffd96a";
    c.font = "bold 190px Georgia, serif";
    c.fillText(String(data.score), 80, 470);
    c.fillStyle = "#f1e6c8";
    c.font = "34px Georgia, serif";
    c.fillText("\u043E\u0447\u043A\u043E\u0432", 90, 520);
    c.font = "38px Georgia, serif";
    const lines = [`${data.nights} \u0438\u0437 10 \u043D\u043E\u0447\u0435\u0439`, `${data.pop} \u0436\u0438\u0442\u0435\u043B\u0435\u0439 \u0432\u044B\u0436\u0438\u043B\u043E`, data.endingTitle || ""];
    if (data.place)
      lines.push(`${data.place}-\u0435 \u043C\u0435\u0441\u0442\u043E`);
    lines.forEach((t, i) => c.fillText(t, 640, 330 + i * 56));
    c.fillStyle = "#9c8a64";
    c.font = "26px Georgia, serif";
    c.fillText((data.nick ? data.nick + " \xB7 " : "") + "\u0441\u0438\u0434 " + (data.seed >>> 0) + " \xB7 \u043F\u043E\u0431\u044C\u0451\u0442\u0435?", 80, 580);
    return canvas2;
  }
  function canvasToBlob(canvas2) {
    return new Promise((res) => {
      try {
        canvas2.toBlob((b) => res(b), "image/png");
      } catch (e) {
        res(null);
      }
    });
  }

  // src/core/score.js
  var ENDING_BONUS = { light: 300, smoke: 150, iron: 150, cold: 50, boom: 0, silence: 0 };
  function computeScore({ nights, pop, ending, burnouts = 0, smog = 0 }) {
    return Math.max(0, nights * 100 + Math.round(pop / 2) + (ENDING_BONUS[ending] || 0) - burnouts * 25 - smog);
  }
  function nightsDone(s2) {
    return s2.ending === "boom" || s2.ending === "silence" ? Math.min(s2.night, 9) : 10;
  }
  function runResult(s2, smogAvgFn, durS) {
    const nights = nightsDone(s2), pop = Math.max(0, Math.min(1e3, Math.round(s2.pop)));
    const burnouts = Math.min(60, s2.burnouts | 0), smog = Math.max(0, Math.min(100, Math.round(smogAvgFn(s2))));
    return { ending: s2.ending, nights, pop, burnouts, smog, duration_s: Math.round(durS * 10) / 10, score: computeScore({ nights, pop, ending: s2.ending, burnouts, smog }) };
  }

  // src/net/mp.js
  function wsUrl(search = "", debug = false) {
    if (debug) {
      const o = new URLSearchParams(search).get("ws");
      if (o && /^wss?:\/\/[\w.:-]+(\/[\w./-]*)?$/.test(o))
        return o;
    }
    return "wss://185-255-133-179.sslip.io/steam/ws" ? "wss://185-255-133-179.sslip.io/steam/ws" : DEFAULT_WS;
  }
  var CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
  function normalizeCode(raw) {
    return String(raw || "").toUpperCase().replace(/[\s-]/g, "").slice(0, 8);
  }
  function roomFromSearch(search) {
    const c = new URLSearchParams(search).get("room");
    return c && CODE_RE.test(c.toUpperCase()) ? c.toUpperCase() : "";
  }
  function inviteLink(loc, code) {
    return `${loc.origin}${loc.pathname}?room=${encodeURIComponent(code)}`;
  }
  var EMOJI = { thumbs: "\u{1F44D}", fire: "\u{1F525}", scream: "\u{1F631}", heart: "\u2764\uFE0F", clap: "\u{1F44F}", cold: "\u{1F976}", steam: "\u{1F4A8}", sos: "\u{1F198}" };
  var EMOJI_NAMES = { thumbs: "\u041A\u043B\u0430\u0441\u0441", fire: "\u0416\u0430\u0440\u043A\u043E", scream: "\u0423\u0436\u0430\u0441", heart: "\u0421\u0435\u0440\u0434\u0446\u0435", clap: "\u0410\u043F\u043B\u043E\u0434\u0438\u0441\u043C\u0435\u043D\u0442\u044B", cold: "\u0425\u043E\u043B\u043E\u0434\u043D\u043E", steam: "\u041F\u0430\u0440", sos: "\u041F\u043E\u043C\u043E\u0433\u0438\u0442\u0435" };
  var ERR_TEXT = {
    no_such_room: "\u0422\u0430\u043A\u043E\u0439 \u043A\u043E\u043C\u043D\u0430\u0442\u044B \u043D\u0435\u0442 (\u0438\u043B\u0438 \u0438\u0433\u0440\u0430 \u0443\u0436\u0435 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0430\u0441\u044C).",
    room_full: "\u041A\u043E\u043C\u043D\u0430\u0442\u0430 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0430.",
    already_started: "\u0418\u0433\u0440\u0430 \u0432 \u044D\u0442\u043E\u0439 \u043A\u043E\u043C\u043D\u0430\u0442\u0435 \u0443\u0436\u0435 \u043D\u0430\u0447\u0430\u043B\u0430\u0441\u044C.",
    create_limit: "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043D\u043E\u0432\u044B\u0445 \u043A\u043E\u043C\u043D\u0430\u0442 \u043F\u043E\u0434\u0440\u044F\u0434. \u041F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043C\u0438\u043D\u0443\u0442.",
    server_full: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0441\u0435\u0439\u0447\u0430\u0441 \u043F\u0435\u0440\u0435\u043F\u043E\u043B\u043D\u0435\u043D. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.",
    need_players: "\u041D\u0443\u0436\u043D\u043E \u043C\u0438\u043D\u0438\u043C\u0443\u043C \u0434\u0432\u043E\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0432 \u0441\u0435\u0442\u0438.",
    not_ready: "\u041D\u0435 \u0432\u0441\u0435 \u0438\u0433\u0440\u043E\u043A\u0438 \u0433\u043E\u0442\u043E\u0432\u044B.",
    not_host: "\u041D\u0430\u0447\u0430\u0442\u044C \u0438\u0433\u0440\u0443 \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0445\u043E\u0437\u044F\u0438\u043D \u043A\u043E\u043C\u043D\u0430\u0442\u044B.",
    rate_limit: "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0447\u0430\u0441\u0442\u043E. \u041F\u043E\u043C\u0435\u0434\u043B\u0435\u043D\u043D\u0435\u0435.",
    chat_rate: "\u041D\u0435 \u0442\u0430\u043A \u0431\u044B\u0441\u0442\u0440\u043E \u2014 \u0447\u0430\u0442 \u0440\u0430\u0437 \u0432 \u0441\u0435\u043A\u0443\u043D\u0434\u0443.",
    bad_chat: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E (\u043F\u0443\u0441\u0442\u043E\u0435 \u0438\u043B\u0438 \u0441\u043E \u0441\u0441\u044B\u043B\u043A\u043E\u0439).",
    forbidden: "\u042D\u0442\u0438\u043C \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0435 \u043D\u0435 \u0432\u044B.",
    bad_value: "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.",
    bad_json: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0432\u044F\u0437\u0438.",
    bad_message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0432\u044F\u0437\u0438.",
    unknown: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u0430.",
    no_room: "\u0412\u044B \u043D\u0435 \u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u0435.",
    not_playing: "\u0418\u0433\u0440\u0430 \u0435\u0449\u0451 \u043D\u0435 \u0438\u0434\u0451\u0442.",
    bad_state: "\u0421\u0435\u0439\u0447\u0430\u0441 \u0442\u0430\u043A \u043D\u0435\u043B\u044C\u0437\u044F."
  };
  var MODE_NAMES = { coop: "\u041A\u043E\u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432", versus: "\u0421\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u043D\u0438\u0435" };
  var BOARD_STATE = { playing: "\u0438\u0433\u0440\u0430\u0435\u0442", done: "\u0444\u0438\u043D\u0438\u0448", dnf: "\u0432\u044B\u0448\u0435\u043B", offline: "\u043D\u0435\u0442 \u0441\u0432\u044F\u0437\u0438" };
  function boardView(rows, me) {
    if (!Array.isArray(rows))
      return [];
    return rows.slice(0, 4).map((r, i) => ({
      place: i + 1,
      pid: String(r.pid),
      nick: String(r.nick || "?").slice(0, 16),
      score: Math.max(0, r.score | 0),
      night: Math.max(1, Math.min(10, r.night | 0)),
      pop: Math.max(0, r.pop | 0),
      state: BOARD_STATE[r.state] ? r.state : "playing",
      me: r.pid === me
    }));
  }
  var errText = (code) => ERR_TEXT[code] || "\u0427\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A (" + String(code).slice(0, 24) + ").";
  function ownership(roles, players) {
    const nick = (pid) => (players.find((p) => p.pid === pid) || {}).nick || "?";
    const valve = [null, null, null, null];
    let shovel2 = null, leaks = null;
    for (const [pid, r] of Object.entries(roles || {})) {
      for (const i of r.valves)
        valve[i] = pid;
      if (r.shovel)
        shovel2 = pid;
      if (r.leaks)
        leaks = pid;
    }
    return { valve: valve.map((p) => p && { pid: p, nick: nick(p) }), shovel: shovel2 && { pid: shovel2, nick: nick(shovel2) }, leaks: leaks && { pid: leaks, nick: nick(leaks) } };
  }
  var DIST = ["\u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044C", "\u041A\u0432\u0430\u0440\u0442\u0430\u043B\u044B", "\u0417\u0430\u0432\u043E\u0434", "\u0424\u0438\u043B\u044C\u0442\u0440\u044B"];
  function roleSummary(r) {
    if (!r)
      return "";
    const parts = r.valves.map((i) => DIST[i]);
    if (r.shovel)
      parts.push("\u043B\u043E\u043F\u0430\u0442\u0430");
    if (r.leaks)
      parts.push("\u0443\u0442\u0435\u0447\u043A\u0438");
    return parts.join(", ");
  }
  var BACKOFF = [0.5, 1, 2, 3, 5, 5, 8, 8, 10];
  var MpClient = class {
    /**
     * @param {{url: string, onMsg: (m: any) => void, onStatus?: (st: string, info?: any) => void, WS?: any, maxOfflineS?: number, setTimer?: Function, clearTimer?: Function}} o
     */
    constructor(o) {
      var _a;
      this.url = o.url;
      this.onMsg = o.onMsg;
      this.onStatus = o.onStatus || (() => {
      });
      this.WS = o.WS || (typeof WebSocket !== "undefined" ? WebSocket : null);
      this.maxOfflineS = (_a = o.maxOfflineS) != null ? _a : 90;
      this.setTimer = o.setTimer || ((f, ms) => setTimeout(f, ms));
      this.clearTimer = o.clearTimer || ((t) => clearTimeout(t));
      this.ws = null;
      this.status = "idle";
      this.session = null;
      this.wanted = false;
      this.attempt = 0;
      this.offlineSince = 0;
      this.retryT = null;
      this.pingT = null;
      this.openWaiters = [];
    }
    _set(st, info) {
      this.status = st;
      try {
        this.onStatus(st, info);
      } catch (e) {
      }
    }
    /** Открыть соединение. Резолвится при открытии, отклоняется при первой же ошибке (дальше — автоповтор только при наличии сессии). */
    connect() {
      this.wanted = true;
      if (this.ws && (this.status === "open" || this.status === "connecting"))
        return this.status === "open" ? Promise.resolve() : new Promise((res, rej) => this.openWaiters.push([res, rej]));
      return new Promise((res, rej) => {
        this.openWaiters.push([res, rej]);
        this._open();
      });
    }
    _open() {
      if (!this.WS) {
        this._fail(new Error("WebSocket \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D"));
        return;
      }
      this._set(this.attempt ? "reconnecting" : "connecting");
      let ws;
      try {
        ws = new this.WS(this.url);
      } catch (e) {
        this._fail(e);
        return;
      }
      this.ws = ws;
      ws.onopen = () => {
        if (this.ws !== ws)
          return;
        this.attempt = 0;
        this.offlineSince = 0;
        this._set("open");
        this._startPing();
        if (this.session)
          this.send({ t: "rejoin", code: this.session.code, pid: this.session.pid, secret: this.session.secret });
        const w = this.openWaiters;
        this.openWaiters = [];
        w.forEach(([res]) => res());
      };
      ws.onmessage = (ev) => {
        let m;
        try {
          m = JSON.parse(ev.data);
        } catch (e) {
          return;
        }
        if (m && typeof m.t === "string")
          this.onMsg(m);
      };
      ws.onerror = () => {
      };
      ws.onclose = (ev) => {
        if (this.ws === ws)
          this._closed(ev);
      };
    }
    _startPing() {
      this.clearTimer(this.pingT);
      this.pingT = this.setTimer(() => {
        this.send({ t: "ping" });
        this._startPing();
      }, 2e4);
    }
    _closed(ev) {
      this.ws = null;
      this.clearTimer(this.pingT);
      const w = this.openWaiters;
      this.openWaiters = [];
      if (w.length && !this.session) {
        this._set("closed", { code: ev && ev.code });
        w.forEach(([, rej]) => rej(new Error("connect failed")));
        this.wanted = false;
        return;
      }
      if (!this.wanted) {
        this._set("closed", { code: ev && ev.code });
        return;
      }
      const code = ev && ev.code;
      if (code === 1008 || code === 1009 || code === 4e3) {
        this._set("closed", { code });
        this.wanted = false;
        w.forEach(([, rej]) => rej(new Error("rejected")));
        return;
      }
      if (!this.session) {
        this._set("closed", { code });
        this.wanted = false;
        return;
      }
      this._retry();
    }
    _fail(e) {
      const w = this.openWaiters;
      this.openWaiters = [];
      this.wanted = false;
      this._set("closed", { error: String(e && e.message || e) });
      w.forEach(([, rej]) => rej(e));
    }
    _retry() {
      if (!this.offlineSince)
        this.offlineSince = Date.now();
      if (Date.now() - this.offlineSince > this.maxOfflineS * 1e3) {
        this.wanted = false;
        this._set("lost");
        return;
      }
      const d = BACKOFF[Math.min(this.attempt, BACKOFF.length - 1)] * 1e3 * (0.8 + Math.random() * 0.4);
      this.attempt++;
      this._set("reconnecting", { in: d });
      this.retryT = this.setTimer(() => {
        if (this.wanted)
          this._open();
      }, d);
    }
    send(obj) {
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(JSON.stringify(obj));
        return true;
      }
      return false;
    }
    setSession(s2) {
      this.session = s2;
    }
    close() {
      this.wanted = false;
      this.session = null;
      this.clearTimer(this.retryT);
      this.clearTimer(this.pingT);
      if (this.ws) {
        try {
          this.ws.close(1e3);
        } catch (e) {
        }
      }
      this.ws = null;
      this._set("closed", {});
    }
  };

  // src/ui/lobby.js
  var LobbyUi = class {
    /** @param {(id: string) => HTMLElement} $  @param {Record<string, Function>} cb */
    constructor($2, cb) {
      this.$ = $2;
      this.cb = cb;
      this.me = null;
      this.chatOpen = false;
      this.floatN = 0;
      const emos = $2("mp-emos");
      for (const [k, ch] of Object.entries(EMOJI)) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "emo";
        b.textContent = ch;
        b.setAttribute("aria-label", EMOJI_NAMES[k]);
        b.title = EMOJI_NAMES[k];
        b.addEventListener("click", () => cb.onEmo(k));
        emos.appendChild(b);
      }
      $2("mp-chatbtn").addEventListener("click", () => this.toggleChat());
      $2("mp-chatform").addEventListener("submit", (e) => {
        e.preventDefault();
        const i = $2("mp-chatin"), v = i.value.trim();
        if (v) {
          cb.onChat(v);
          i.value = "";
        }
      });
      $2("mp-create").addEventListener("click", () => cb.onCreate($2("mp-nick").value, +$2("mp-max").value, $2("mp-mode").value));
      $2("mp-mode").addEventListener("change", () => {
        $2("mp-modehint").hidden = false;
      });
      $2("mp-bot").addEventListener("click", () => cb.onBot());
      $2("mp-share").addEventListener("click", () => cb.onShare());
      if (!(typeof navigator !== "undefined" && navigator.share))
        $2("mp-share").hidden = true;
      else
        $2("mp-share").hidden = false;
      $2("mp-join").addEventListener("click", () => cb.onJoin($2("mp-nick").value, $2("mp-code").value));
      $2("mp-code").addEventListener("keydown", (e) => {
        if (e.key === "Enter")
          cb.onJoin($2("mp-nick").value, $2("mp-code").value);
      });
      $2("mp-ready").addEventListener("click", () => cb.onReady());
      $2("mp-start").addEventListener("click", () => cb.onStart());
      $2("mp-leave").addEventListener("click", () => cb.onLeave());
      $2("mp-back").addEventListener("click", () => cb.onBack());
      $2("mp-copy").addEventListener("click", () => cb.onCopy());
    }
    setStatus(text2, bad = false) {
      const el = this.$("mp-status");
      el.textContent = text2 || "";
      el.classList.toggle("bad", !!bad);
    }
    showEntry() {
      this.$("mp-entry").hidden = false;
      this.$("mp-room").hidden = true;
    }
    setBusy(b) {
      for (const id of ["mp-create", "mp-join"])
        this.$(id).disabled = !!b;
    }
    toggleChat(open) {
      this.chatOpen = open === void 0 ? !this.chatOpen : open;
      this.$("mp-tray").hidden = !this.chatOpen;
      this.$("mp-hud").classList.toggle("chat-open", this.chatOpen);
      this.$("mp-chatbtn").setAttribute("aria-expanded", String(this.chatOpen));
      if (this.chatOpen)
        setTimeout(() => this.$("mp-chatin").focus({ preventScroll: true }), 20);
    }
    hud(visible) {
      this.$("mp-hud").hidden = !visible;
      if (!visible)
        this.toggleChat(false);
    }
    /** Состояние комнаты: m — сообщение lobby, me — pid игрока */
    renderRoom(m, me) {
      this.me = me;
      this.$("mp-entry").hidden = true;
      this.$("mp-room").hidden = false;
      this.$("mp-roomcode").textContent = m.code;
      this.$("mp-modename").textContent = MODE_NAMES[m.mode] || MODE_NAMES.coop;
      const ul = this.$("mp-players");
      ul.textContent = "";
      for (const p of m.players) {
        const li = document.createElement("li");
        li.className = (p.online ? "" : "off ") + (p.pid === me ? "me" : "");
        const dot = document.createElement("i");
        dot.className = "dot " + (p.online ? "on" : "off");
        dot.setAttribute("aria-hidden", "true");
        const name = document.createElement("b");
        name.textContent = (p.bot ? "\u{1F916} " : "") + p.nick + (p.pid === me ? " (\u0432\u044B)" : "");
        if (p.bot)
          li.classList.add("bot");
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = (p.bot ? "\u0418\u0418-\u043D\u0430\u043F\u0430\u0440\u043D\u0438\u043A" : p.pid === m.host ? "\u2605 \u0445\u043E\u0437\u044F\u0438\u043D" : p.ready ? "\u2713 \u0433\u043E\u0442\u043E\u0432" : "\u043D\u0435 \u0433\u043E\u0442\u043E\u0432") + (p.online ? "" : " \xB7 \u043D\u0435\u0442 \u0441\u0432\u044F\u0437\u0438");
        li.append(dot, name, tag);
        if (m.state === "playing" && p.role) {
          const r = document.createElement("small");
          r.textContent = roleSummary(p.role);
          li.append(r);
        }
        if (m.host === me && p.pid !== me && m.state === "lobby") {
          const k = document.createElement("button");
          k.type = "button";
          k.className = "btn small";
          k.textContent = "\u0423\u0431\u0440\u0430\u0442\u044C";
          k.setAttribute("aria-label", "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0433\u0440\u043E\u043A\u0430 " + p.nick);
          k.addEventListener("click", () => p.bot ? this.cb.onBot(true) : this.cb.onKick(p.pid));
          li.append(k);
        }
        ul.append(li);
      }
      const hasBot = m.players.some((p) => p.bot);
      const isHost = m.host === me, mine = m.players.find((p) => p.pid === me);
      const others = m.players.filter((p) => p.pid !== m.host && !p.bot);
      const canStart = m.players.length >= 2 && m.players.every((p) => p.online || p.bot) && others.every((p) => p.ready);
      const lobbyState = m.state === "lobby";
      const botBtn = this.$("mp-bot");
      botBtn.hidden = !(isHost && m.mode !== "versus" && m.state === "lobby" && !hasBot && m.players.length < m.max);
      this.$("mp-start").hidden = !isHost;
      this.$("mp-start").disabled = lobbyState && !canStart;
      this.$("mp-start").textContent = lobbyState ? "\u041D\u0430\u0447\u0430\u0442\u044C \u0438\u0433\u0440\u0443" : "\u041D\u043E\u0432\u0430\u044F \u0438\u0433\u0440\u0430";
      this.$("mp-ready").hidden = isHost || !lobbyState;
      this.$("mp-ready").textContent = mine && mine.ready ? "\u041D\u0435 \u0433\u043E\u0442\u043E\u0432" : "\u0413\u043E\u0442\u043E\u0432";
      if (!lobbyState) {
        this.setStatus(m.state === "playing" ? "\u0418\u0434\u0451\u0442 \u0438\u0433\u0440\u0430." : isHost ? "\u0418\u0433\u0440\u0430 \u043E\u043A\u043E\u043D\u0447\u0435\u043D\u0430. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041D\u043E\u0432\u0430\u044F \u0438\u0433\u0440\u0430\xBB, \u0447\u0442\u043E\u0431\u044B \u0432\u0435\u0440\u043D\u0443\u0442\u044C \u0432\u0441\u0435\u0445 \u0432 \u043B\u043E\u0431\u0431\u0438." : "\u0418\u0433\u0440\u0430 \u043E\u043A\u043E\u043D\u0447\u0435\u043D\u0430. \u0416\u0434\u0451\u043C \u0445\u043E\u0437\u044F\u0438\u043D\u0430.");
        return;
      }
      this.setStatus(m.players.length < 2 ? `\u0416\u0434\u0451\u043C \u0438\u0433\u0440\u043E\u043A\u043E\u0432 (${m.players.length} \u0438\u0437 ${m.max}). \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0434\u0440\u0443\u0437\u044C\u044F\u043C \u043A\u043E\u0434 \u0438\u043B\u0438 \u0441\u0441\u044B\u043B\u043A\u0443.` : isHost ? canStart ? "\u0412\u0441\u0435 \u0433\u043E\u0442\u043E\u0432\u044B \u2014 \u043C\u043E\u0436\u043D\u043E \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C." : "\u0416\u0434\u0451\u043C, \u043F\u043E\u043A\u0430 \u0432\u0441\u0435 \u043D\u0430\u0436\u043C\u0443\u0442 \xAB\u0413\u043E\u0442\u043E\u0432\xBB." : "\u0416\u0434\u0451\u043C, \u043F\u043E\u043A\u0430 \u0445\u043E\u0437\u044F\u0438\u043D \u043D\u0430\u0447\u043D\u0451\u0442 \u0438\u0433\u0440\u0443.");
    }
    addChat(m) {
      const ul = this.$("mp-chatlog"), li = document.createElement("li");
      const b = document.createElement("b");
      b.textContent = m.nick + ": ";
      const s2 = document.createElement("span");
      s2.textContent = m.text;
      li.append(b, s2);
      ul.append(li);
      while (ul.children.length > 40)
        ul.firstChild.remove();
      ul.scrollTop = ul.scrollHeight;
      li.classList.add("fresh");
      setTimeout(() => li.classList.remove("fresh"), 9e3);
    }
    clearChat() {
      this.$("mp-chatlog").textContent = "";
    }
    floatEmoji(m) {
      const box = this.$("mp-float");
      if (box.children.length > 12)
        return;
      const d = document.createElement("div");
      d.className = "floaty";
      d.style.left = 10 + this.floatN++ * 17 % 70 + "%";
      const e = document.createElement("span");
      e.textContent = EMOJI[m.e] || "";
      const n = document.createElement("small");
      n.textContent = m.nick;
      d.append(e, n);
      box.append(d);
      setTimeout(() => d.remove(), 2600);
    }
  };

  // src/main.js
  var DT = 1 / 60;
  var SAVE_KEY = "last-boiler-save-v1";
  var SET_KEY = "last-boiler-settings-v1";
  var META_KEY = "last-boiler-meta-v1";
  var NICK_KEY = "last-boiler-nick-v1";
  var PID_KEY = "last-boiler-pid-v1";
  var $ = (id) => document.getElementById(id);
  var params = new URLSearchParams(location.search);
  var DEBUG = params.has("debug");
  var canvas = $("game");
  var ctx = canvas.getContext("2d");
  var sound = new Sound();
  var fx = new Fx();
  var mq = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {
      }
    },
    del(k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {
      }
    }
  };
  var settings = { stats: true, sound: true, sfx: 70, music: 60, reduce: mq.matches, shake: true };
  try {
    const saved = JSON.parse(store.get(SET_KEY) || "{}");
    if (saved.sfx === void 0 && saved.vol !== void 0) {
      saved.sfx = saved.vol;
      if (saved.music !== void 0)
        saved.music = Math.min(100, saved.music + 10);
    }
    delete saved.vol;
    Object.assign(settings, saved);
  } catch (e) {
  }
  for (const k of ["sfx", "music"])
    settings[k] = Math.max(0, Math.min(100, +settings[k] || 0));
  var meta = cleanMeta(null);
  try {
    meta = cleanMeta(JSON.parse(store.get(META_KEY) || "{}"));
  } catch (e) {
  }
  var game = { mode: "solo", daily: null, chal: 0, counted: false, review: null, fresh: [] };
  var s = createState(1);
  var ui = "title";
  var prevUi = "title";
  var snap = null;
  var log = [];
  var banner = null;
  var time = 0;
  var acc = 0;
  var last = 0;
  var endTimer = 0;
  var view = { portrait: false, scale: 1, W: 1100, H: 700 };
  var L = makeLayout(1100, 700, false);
  var dpr = 1;
  var bg = null;
  var city = null;
  var input = { sel: 0, drag: -1, shovelDown: 0, hover: null };
  var vis = { needle: 22, fireShown: 0, satShown: [1, 1, 1, 1], popShown: POP_START, swing: 0, kidSwing: 0, wheelKick: [0, 0, 0, 0], snow: [], t: 0, shakeKick: 0 };
  var speedParam = DEBUG ? Math.max(1, Math.min(60, +(params.get("speed") || 1))) : 1;
  var dbg = { bot: null, botOpts: {}, speed: speedParam };
  var rnd = makeRng(99);
  for (let i = 0; i < 70; i++)
    vis.snow.push({ x: rnd() * 1400, y: rnd() * 90, s: 1 + rnd() * 1.6, v: 8 + rnd() * 16, dx: 6 + rnd() * 10 });
  var gears = [];
  var run = new Run(() => settings.stats);
  var playTime = 0;
  var boardAvailable = false;
  var boardCur = "score";
  var submitted = false;
  var vstat = { sum: [0, 0, 0, 0], t: 0, moves: 0, prev: [0, 0, 0, 0], moving: false };
  function resetRunStats() {
    playTime = 0;
    submitted = false;
    vstat.sum = [0, 0, 0, 0];
    vstat.t = 0;
    vstat.moves = 0;
    vstat.prev = s.valves.slice();
    vstat.moving = false;
  }
  var avgValves = () => vstat.sum.map((x) => Math.round(vstat.t > 0 ? x / vstat.t * 1e3 : 0) / 1e3);
  function startRun() {
    resetRunStats();
    run.begin().then((tk) => {
      if (tk)
        run.event("start", deviceInfo());
      updateBoardBtn();
    });
  }
  function applySettings() {
    sound.set({ enabled: settings.sound, sfxVol: settings.sfx / 100, musicVol: settings.music / 100 });
    fx.reduced = settings.reduce;
    fx.shakeOn = settings.shake;
    document.documentElement.classList.toggle("reduce", settings.reduce);
    store.set(SET_KEY, JSON.stringify(settings));
  }
  function resize() {
    const cr = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(cr.width || window.innerWidth)), cssH = Math.max(1, Math.round(cr.height || window.innerHeight));
    const small = Math.min(cssW, cssH) < 700;
    dpr = Math.min(window.devicePixelRatio || 1, small ? 2 : 2.5);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    view = viewFor(cssW, cssH);
    L = makeLayout(view.W, view.H, view.portrait);
    view.W = L.fullW;
    bg = makeBackground(cssW / view.scale, cssH / view.scale, dpr, view.scale);
    city = makeCity(L.fullW, L.sky.h);
    gears = makeGears();
  }
  function makeGears() {
    const g = [], r = makeRng(31);
    const P = view.portrait;
    const spots = P ? [[28, 330, 22, 10, "brass", 1], [372, 360, 26, 11, "iron", -1], [30, 820, 26, 11, "copper", 1], [374, 700, 18, 9, "brass", -1]] : [[24, 150, 34, 12, "brass", 1], [58, 188, 22, 9, "iron", -1], [L.W - 20, 300, 40, 14, "iron", 1], [L.W - 24, 612, 34, 12, "brass", -1], [540, 680, 26, 10, "copper", 1], [300, 436, 18, 8, "brass", -1], [L.W - 56, 660, 20, 9, "copper", 1]];
    for (const [x, y, rad, n, kind, dir] of spots)
      g.push({ x, y, r: rad, n, kind, dir, rot: r() * 6, a: 0.85 });
    return g;
  }
  function say(who, text2, kind = "info", col) {
    log.push({ who, text: text2, kind, col, at: time });
    if (log.length > 12)
      log.shift();
    $("sr-status").textContent = (who ? who + ": " : "") + text2;
  }
  var coach = new Coach();
  var toast = null;
  function showToast(title, text2, col, dur) {
    toast = { title, text: text2, col, t0: time, dur };
    $("sr-status").textContent = title + ": " + text2;
  }
  var notes = new Notes();
  function showHint(h) {
    notes.noteHint();
    showToast("\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430", h.text, "#9fd8a6", 9);
  }
  function requestNote(req) {
    call(`/note?s=${encodeURIComponent(req.s)}&n=${req.n}`).then((r) => {
      const txt = notes.accept(r, req, s);
      if (txt)
        showToast("\u0417\u0430\u043C\u0435\u0442\u043A\u0430 \u043C\u0435\u0445\u0430\u043D\u0438\u043A\u0430", txt, "#e0b866", Math.min(20, Math.max(9, 6 + txt.length / 14)));
    }, () => notes.fail());
  }
  var PIPE_NAMES = ["\u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044F", "\u041A\u0432\u0430\u0440\u0442\u0430\u043B\u043E\u0432", "\u0417\u0430\u0432\u043E\u0434\u0430", "\u0424\u0438\u043B\u044C\u0442\u0440\u043E\u0432"];
  function handleEvents() {
    for (const e of s.events) {
      coach.onEvent(e, s);
      notes.onEvent(e);
      switch (e.type) {
        case "shovel":
          sound.play("shovel");
          vis.swing = 1;
          {
            const f = L.furnace;
            fx.sparks(f.x + f.w * 0.5, f.y + f.h * 0.6, 12, { v: 140 });
            fx.steam(f.x + f.w * 0.5, f.y + 20, 2, { vy: -50 });
          }
          break;
        case "spill":
          sound.play("spill");
          say("", "\u0422\u043E\u043F\u043A\u0430 \u043F\u0435\u0440\u0435\u043F\u043E\u043B\u043D\u0435\u043D\u0430 \u2014 \u0443\u0433\u043E\u043B\u044C \u0432\u044B\u0441\u044B\u043F\u0430\u0435\u0442\u0441\u044F!", "warn");
          fx.text(L.furnace.x + L.furnace.w / 2, L.furnace.y, "\u041F\u0435\u0440\u0435\u0431\u043E\u0440!", "#f0c24a", 16);
          vis.swing = 1;
          break;
        case "nocoal":
          sound.play("nocoal");
          fx.text(L.shovel.x + L.shovel.w / 2, L.shovel.y - 6, "\u041D\u0435\u0442 \u0443\u0433\u043B\u044F!", "#e0523c", 16);
          break;
        case "leak":
          sound.play("leak");
          say("", `\u0423\u0442\u0435\u0447\u043A\u0430 \u043F\u0430\u0440\u0430 \u0432 \u0442\u0440\u0443\u0431\u0435 ${PIPE_NAMES[e.pipe]}!`, "warn");
          break;
        case "fix": {
          sound.play("fix");
          const c = column(L, e.pipe);
          fx.sparks(c.leak.x, c.leak.y, 10, { col: "240,220,150", v: 120 });
          fx.text(c.leak.x, c.leak.y - 14, "\u0417\u0430\u0434\u0435\u043B\u0430\u043D\u043E", "#9be08f", 14);
          break;
        }
        case "vent":
          sound.play("vent");
          break;
        case "timka":
          sound.play("timka");
          vis.kidSwing = 1;
          break;
        case "tutstep":
          sound.play("tut");
          break;
        case "collapse":
          sound.play("collapse");
          fx.shake(0.8);
          say("\u0420\u0430\u0431\u043E\u0447\u0438\u0435", "\u0421\u043C\u0435\u043D\u0430 \u043D\u0435 \u0432\u044B\u0434\u0435\u0440\u0436\u0430\u043B\u0430! \u0417\u0430\u0432\u043E\u0434 \u0432\u0441\u0442\u0430\u043B \u043D\u0430 8 \u0441\u0435\u043A\u0443\u043D\u0434.", "warn", "#e0523c");
          {
            const c = column(L, 2);
            fx.steam(c.cx, c.y + 60, 14, { vy: -90, r: 10, grow: 40 });
          }
          break;
        case "loss":
          sound.play("loss");
          break;
        case "talk":
          say(e.who, e.text, "talk");
          break;
        case "event":
          sound.play("event");
          banner = { label: e.label, at: time };
          say("", e.label + ".", "warn");
          break;
        case "hostev": {
          sound.play("event");
          const h = HOST_EVENTS.find((x) => x.id === e.id);
          const txt = e.text || (h ? h.text : "");
          banner = { label: e.label, at: time };
          say("\u0412\u0435\u0434\u0443\u0449\u0438\u0439", txt || e.label + ".", "warn", "#9fd8f0");
          break;
        }
        case "night":
          sound.play("night");
          log = [];
          toast = null;
          break;
        case "nightend":
          sound.play("nightend");
          break;
        case "ending":
          sound.play(e.id === "boom" ? "boom" : "warn");
          if (e.id === "boom") {
            fx.shake(1.2);
            const g = L.gauge;
            for (let k = 0; k < 6; k++)
              fx.steam(L.tank.x + L.tank.w / 2, L.tank.y + L.tank.h / 2, 30, { spread: 160, vy: -140, jx: 220, r: 16, grow: 80, life: 2.2, a: 0.8 });
          }
          break;
        default:
          break;
      }
    }
    s.events.length = 0;
  }
  function saveGame() {
    if (s.phase === "ended" || game.mode !== "solo" || mp && mp.inGame)
      return;
    const str = serialize(s);
    store.set(SAVE_KEY, str);
  }
  function hasSave() {
    return !!store.get(SAVE_KEY);
  }
  function loadGame() {
    const o = loadSaved(store.get(SAVE_KEY));
    if (!o) {
      store.del(SAVE_KEY);
      return false;
    }
    s = o;
    return true;
  }
  var lastPhase = null;
  var lastNight = -1;
  function trackPhase() {
    if (s.phase !== lastPhase || s.night !== lastNight) {
      lastPhase = s.phase;
      lastNight = s.night;
      const online = !!(mp && mp.inGame) || game.mode !== "solo";
      if (s.phase !== "ended")
        game.counted = false;
      if (s.phase === "night" && s.t === 0) {
        if (!online) {
          snap = serialize(s);
          saveGame();
        }
      } else if (s.phase === "summary" || s.phase === "card") {
        if (!online) {
          saveGame();
          if (s.phase === "summary" && s.summary)
            run.event("night_end", nightPayload(s.summary));
        }
      } else if (s.phase === "ended") {
        if (online) {
          if (!meta.endings.includes(s.ending)) {
            meta.endings.push(s.ending);
            store.set(META_KEY, JSON.stringify(meta));
          }
          if (game.mode !== "solo" && !(mp && mp.inGame)) {
            meta.plays++;
            store.set(META_KEY, JSON.stringify(meta));
          }
        } else {
          store.del(SAVE_KEY);
          recordEnding();
        }
      }
      routeUi();
    }
  }
  function nightPayload(m) {
    return { night: m.night, ok: true, pop: m.pop, lost: m.lost, coal: Math.max(0, Math.min(99, Math.floor(s.coal))), smog: m.smog, fw: m.fw, burnouts: Math.min(60, m.burnouts | 0), dur_s: Math.round(playTime * 10) / 10, valves: avgValves(), moves: vstat.moves };
  }
  function endingResult() {
    return runResult(s, smogAvg, playTime);
  }
  function recordEnding() {
    const r = endingResult();
    run.event("ending", { ending: r.ending, nights: r.nights, pop: r.pop, burnouts: r.burnouts, smog: r.smog, dur_s: r.duration_s, score: r.score, valves: avgValves(), moves: vstat.moves });
    if (!meta.endings.includes(s.ending))
      meta.endings.push(s.ending);
    meta.plays++;
    store.set(META_KEY, JSON.stringify(meta));
  }
  var screens = ["title", "lobby", "prologue", "pause", "settings", "help", "card", "summary", "ending", "board", "daily", "ach"];
  function show(id) {
    for (const k of screens)
      $(k).hidden = k !== id;
    if (id) {
      const first = $(id).querySelector(".btn.primary, .choice");
      if (first)
        setTimeout(() => first.focus({ preventScroll: true }), 30);
    } else if (document.activeElement && document.activeElement !== document.body)
      document.activeElement.blur();
  }
  function routeUi() {
    if (ui === "play" || ui === "card" || ui === "summary") {
      if (s.phase === "night") {
        ui = "play";
        show(null);
      } else if (s.phase === "summary") {
        ui = "summary";
        renderSummary();
        show("summary");
      } else if (s.phase === "card") {
        ui = "card";
        renderCard();
        show("card");
      } else if (s.phase === "ended") {
        endTimer = s.ending === "boom" ? 2.4 : 0.8;
        ui = "play";
        show(null);
      }
    }
  }
  var pillTimer = 0;
  function updatePill() {
    const need = sound.needsTap();
    const b = $("b-snd");
    if (b.hidden === need)
      b.hidden = !need;
    const st = $("o-sndstate");
    if (st)
      st.textContent = !settings.sound ? "\u0417\u0432\u0443\u043A \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D." : sound.state === "running" ? "\u0417\u0432\u0443\u043A \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442." : sound.state === "dead" ? "\u0417\u0432\u0443\u043A \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0432 \u044D\u0442\u043E\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435." : "\u0417\u0432\u0443\u043A \u0436\u0434\u0451\u0442 \u043A\u0430\u0441\u0430\u043D\u0438\u044F \u044D\u043A\u0440\u0430\u043D\u0430 \u2014 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0432\u0443\u043A\xBB.";
  }
  function schedulePill(ms = 700) {
    clearTimeout(pillTimer);
    pillTimer = setTimeout(updatePill, ms);
  }
  function updateTitle() {
    $("b-continue").hidden = !hasSave();
    const n = meta.endings.length;
    $("t-endings").textContent = n ? `\u041E\u0442\u043A\u0440\u044B\u0442\u043E \u043A\u043E\u043D\u0446\u043E\u0432\u043E\u043A: ${n} \u0438\u0437 ${Object.keys(ENDINGS).length}` : "\u0414\u0435\u0441\u044F\u0442\u044C \u043D\u043E\u0447\u0435\u0439. \u0428\u0435\u0441\u0442\u044C \u0441\u0443\u0434\u0435\u0431.";
  }
  function newGame(o = {}) {
    coach.reset();
    notes.reset();
    toast = null;
    snap = null;
    game.mode = o.mode || "solo";
    game.daily = o.daily || null;
    game.chal = o.chal || 0;
    game.review = null;
    game.counted = false;
    s = createState(o.seed || Math.random() * 2 ** 31 | 0 || 1, o.mode ? { skipTutorial: true, host: o.mode === "daily" } : {});
    lastPhase = null;
    lastNight = -1;
    log = [];
    fx.clear();
    banner = null;
    vis.satShown = [1, 1, 1, 1];
    vis.popShown = POP_START;
    vis.needle = s.P;
    vis.fireShown = 0;
    if (game.mode === "solo")
      store.del(SAVE_KEY);
    startRun();
    if (o.mode) {
      startPlay();
      if (o.toast)
        showToast(o.toast[0], o.toast[1], "#e0b866", 12);
    } else {
      show("prologue");
      ui = "prologue";
    }
  }
  function startPlay() {
    sound.ensure();
    sound.startMusic();
    beginPlayFromState();
  }
  function beginPlayFromState() {
    var _a;
    s.phase === "night" && s.t === 0 && snap == null && (snap = serialize(s));
    lastPhase = null;
    lastNight = -1;
    ui = "play";
    trackPhase();
    if (s.phase === "night") {
      ui = "play";
      show(null);
    }
    if (s.night === 0 && s.t === 0 && !((_a = s.tut) == null ? void 0 : _a.done))
      say("\u0410\u0433\u0430\u0444\u044C\u044F", "\u0422\u043E\u043F\u043A\u0430 \u043E\u0441\u0442\u044B\u043B\u0430. \u0413\u043E\u0440\u043E\u0434 \u0436\u0434\u0451\u0442 \u0442\u0435\u043F\u043B\u0430.", "talk", "#e39a62");
  }
  function continueGame() {
    coach.reset();
    notes.reset();
    toast = null;
    game.mode = "solo";
    game.chal = 0;
    game.daily = null;
    if (!loadGame()) {
      newGame();
      return;
    }
    log = [];
    fx.clear();
    banner = null;
    vis.satShown = s.sat.slice();
    vis.popShown = s.pop;
    vis.needle = s.P;
    vis.fireShown = s.fire;
    sound.ensure();
    sound.startMusic();
    startRun();
    snap = s.phase === "night" ? serialize(s) : snap;
    lastPhase = null;
    lastNight = -1;
    ui = "play";
    trackPhase();
    routeUi();
    if (s.phase === "night")
      show(null);
  }
  function retryNight() {
    if (!snap)
      return;
    s = deserialize(snap);
    log = [];
    fx.clear();
    banner = null;
    lastPhase = null;
    lastNight = -1;
    vis.satShown = s.sat.slice();
    vis.popShown = s.pop;
    vis.needle = s.P;
    vis.fireShown = s.fire;
    ui = "play";
    trackPhase();
    show(null);
  }
  function goMenu() {
    stopToTitle();
  }
  function stopToTitle() {
    if (s.phase !== "ended")
      saveGame();
    ui = "title";
    updateTitle();
    show("title");
  }
  function openOverlay(id) {
    prevUi = ui;
    ui = id;
    show(id);
  }
  function closeOverlay() {
    ui = prevUi;
    if (ui === "play")
      show(null);
    else
      show(ui);
    if (ui === "title")
      updateTitle();
    if (mp && mp.inGame)
      routeUi();
  }
  function pauseGame() {
    if (ui !== "play" || mp && mp.inGame)
      return;
    ui = "pause";
    show("pause");
    sound.silence();
  }
  function resumeGame() {
    ui = "play";
    show(null);
  }
  function renderCard() {
    const c = s.card;
    $("c-who").textContent = c.who;
    $("c-h").textContent = c.title;
    $("c-text").textContent = c.text;
    const box = $("c-opts");
    box.innerHTML = "";
    c.options.forEach((o, i) => {
      const b = document.createElement("button");
      b.className = "choice";
      b.type = "button";
      b.innerHTML = `<kbd>${i + 1}</kbd><b></b><span></span>`;
      b.querySelector("b").textContent = o.label;
      b.querySelector("span").textContent = o.hint;
      b.addEventListener("click", () => pickCard(o.key));
      box.appendChild(b);
    });
  }
  function pickCard(key) {
    if (s.phase !== "card")
      return;
    sound.play("click");
    if (mp && mp.inGame) {
      mp.myVote = key;
      mp.client.send({ t: "card", key });
      mpRefresh();
      return;
    }
    chooseCard(s, key);
    handleEvents();
    trackPhase();
  }
  var NIGHT_LINES = [
    "\u041F\u0435\u0440\u0432\u0430\u044F \u043D\u043E\u0447\u044C \u043F\u043E\u0437\u0430\u0434\u0438. \u0413\u043E\u0440\u043E\u0434 \u0437\u0430\u043F\u043E\u043C\u043D\u0438\u0442, \u043A\u0430\u043A \u0432\u044B \u0440\u0430\u0441\u0442\u043E\u043F\u0438\u043B\u0438 \u0410\u0433\u0430\u0444\u044C\u044E.",
    "\u0423\u0442\u0440\u043E. \u0418\u043D\u0435\u0439 \u043D\u0430 \u043E\u043A\u043D\u0430\u0445 \u043C\u0435\u0434\u043B\u0435\u043D\u043D\u043E \u0442\u0430\u0435\u0442.",
    "\u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044C \u043F\u0435\u0440\u0435\u0436\u0438\u043B \u043B\u0438\u0445\u043E\u0440\u0430\u0434\u043A\u0443.",
    "\u0421\u043C\u0435\u043D\u0430 \u0432\u0435\u0440\u043D\u0443\u043B\u0430\u0441\u044C \u0434\u043E\u043C\u043E\u0439. \u041D\u0435 \u0432\u0441\u0435 \u2014 \u0441\u0432\u043E\u0438\u043C \u0448\u0430\u0433\u043E\u043C.",
    "\u0414\u044B\u043C \u043E\u0441\u0435\u043B \u043D\u0430 \u043A\u0440\u044B\u0448\u0430\u0445. \u0414\u043E\u043A\u0442\u043E\u0440 \u0418\u0432\u0438\u043D\u0430 \u043A\u0430\u0448\u043B\u044F\u0435\u0442 \u0432 \u0440\u0443\u043A\u0430\u0432.",
    "\u041C\u0435\u0442\u0435\u043B\u044C \u0441\u0442\u0438\u0445\u043B\u0430. \u0421\u043B\u043E\u0431\u043E\u0434\u0430 \u0441\u0447\u0438\u0442\u0430\u0435\u0442 \u043F\u0435\u0447\u0438.",
    "\u041B\u0451\u0434 \u043D\u0430 \u043A\u0440\u044B\u0448\u0430\u0445. \u041B\u0451\u0434 \u043D\u0430 \u043E\u043A\u043D\u0430\u0445. \u041B\u0451\u0434 \u0432\u043D\u0443\u0442\u0440\u0438.",
    "\u0421\u0442\u044B\u043B\u044B\u0439 \u0447\u0430\u0441 \u043F\u0440\u043E\u0448\u0451\u043B. \u0414\u043E \u043E\u0431\u043E\u0437\u0430 \u2014 \u0434\u0432\u0435 \u043D\u043E\u0447\u0438.",
    "\u0412\u0435\u0442\u0435\u0440 \u0443\u043D\u0451\u0441 \u043E\u0441\u0442\u0430\u0442\u043A\u0438 \u043C\u0435\u0442\u0435\u043B\u0438. \u041F\u043E\u0447\u0442\u0438 \u0434\u043E\u0448\u043B\u0438.",
    ""
  ];
  function renderSummary() {
    const m = s.summary;
    const N = NIGHTS[m.night];
    $("su-n").textContent = `\u041D\u043E\u0447\u044C ${m.night + 1} \u0438\u0437 ${NIGHTS.length}`;
    $("su-h").textContent = m.night + 1 === NIGHTS.length ? "\u0420\u0430\u0441\u0441\u0432\u0435\u0442. \u041E\u0431\u043E\u0437 \u0443 \u0432\u043E\u0440\u043E\u0442" : "\u0420\u0430\u0441\u0441\u0432\u0435\u0442 \xB7 " + N.name;
    const cls = (v, a, b) => v <= a ? "ok" : v <= b ? "warn" : "bad";
    const items = [
      ["\u0416\u0438\u0442\u0435\u043B\u0435\u0439", `${m.pop}`, m.pop / POP_START > 0.9 ? "ok" : m.pop / POP_START > 0.8 ? "warn" : "bad"],
      ["\u041F\u043E\u0442\u0435\u0440\u044F\u043D\u043E \u0437\u0430 \u043D\u043E\u0447\u044C", m.lost ? `\u2212${m.lost}` : "0", m.lost === 0 ? "ok" : cls(m.lost, 15, 40)],
      ["\u0423\u0433\u043E\u043B\u044C \u0432 \u0431\u0443\u043D\u043A\u0435\u0440\u0435", `${Math.floor(s.coal)} (${m.coalDelta >= 0 ? "+" : ""}${m.coalDelta})`, s.coal > 12 ? "ok" : s.coal > 5 ? "warn" : "bad"],
      ["\u0414\u044B\u043C \u043D\u0430\u0434 \u0433\u043E\u0440\u043E\u0434\u043E\u043C", `${m.smog}%`, cls(m.smog, 25, 50)],
      ["\u0423\u0441\u0442\u0430\u043B\u043E\u0441\u0442\u044C \u0441\u043C\u0435\u043D\u044B", `${m.fw}%`, cls(m.fw, 45, 70)],
      ["\u041F\u0430\u0434\u0435\u043D\u0438\u0439 \u0441\u043C\u0435\u043D\u044B", `${m.burnouts}`, m.burnouts === 0 ? "ok" : "bad"]
    ];
    $("su-stats").innerHTML = items.map(([a, b, c]) => `<div class="stat"><small>${a}</small><strong class="${c}"></strong></div>`).join("");
    [...$("su-stats").querySelectorAll("strong")].forEach((el, i) => {
      el.textContent = items[i][1];
    });
    let txt = NIGHT_LINES[m.night] || "";
    if (m.lost > 25)
      txt = "\u042D\u0442\u0430 \u043D\u043E\u0447\u044C \u0437\u0430\u0431\u0440\u0430\u043B\u0430 \u043B\u044E\u0434\u0435\u0439. \u0418\u0445 \u0438\u043C\u0435\u043D\u0430 \u0432\u0430\u043C \u0441\u043A\u0430\u0436\u0435\u0442 \u0434\u043E\u043A\u0442\u043E\u0440 \u0418\u0432\u0438\u043D\u0430 \u2014 \u043A\u043E\u0433\u0434\u0430 \u0441\u043C\u043E\u0436\u0435\u0442.";
    else if (m.burnouts > 0 && m.night > 2)
      txt = "\u0420\u0430\u0431\u043E\u0447\u0438\u0435 \u043D\u0435 \u0437\u0430\u0431\u0443\u0434\u0443\u0442 \u044D\u0442\u0443 \u043D\u043E\u0447\u044C. \u0417\u0430\u0432\u043E\u0434 \u2014 \u043D\u0435 \u0431\u0435\u0437\u0434\u043E\u043D\u043D\u044B\u0439 \u043A\u043E\u043B\u043E\u0434\u0435\u0446.";
    $("su-text").textContent = txt;
    $("b-next").textContent = m.night + 1 >= NIGHTS.length ? "\u0412\u0441\u0442\u0440\u0435\u0442\u0438\u0442\u044C \u043E\u0431\u043E\u0437" : "\u0414\u0430\u043B\u044C\u0448\u0435";
  }
  function renderEnding() {
    const e = ENDINGS[s.ending];
    const tone = e.tone;
    const el = $("ending");
    el.className = "screen tone-" + tone;
    $("e-kicker").textContent = "\u0424\u0438\u043D\u0430\u043B \xB7 " + (tone === "good" ? "\u043B\u0443\u0447\u0448\u0430\u044F \u043A\u043E\u043D\u0446\u043E\u0432\u043A\u0430" : tone === "fail" ? "\u043A\u0430\u0442\u0430\u0441\u0442\u0440\u043E\u0444\u0430" : "\u0433\u043E\u0440\u044C\u043A\u0430\u044F \u043F\u0440\u0430\u0432\u0434\u0430");
    $("e-h").textContent = e.title;
    $("e-text").innerHTML = e.lines.map((l) => "<p></p>").join("");
    [...$("e-text").querySelectorAll("p")].forEach((p, i) => {
      p.textContent = e.lines[i];
    });
    const alive = Math.round(s.pop), tl = Math.round(toll(s)), sm = Math.round(smogAvg(s));
    const rr2 = endingResult();
    const items = [["\u0421\u0447\u0451\u0442", String(rr2.score)], ["\u0412\u0440\u0435\u043C\u044F \u0438\u0433\u0440\u044B", Math.floor(playTime / 60) + ":" + String(Math.floor(playTime % 60)).padStart(2, "0")], ["\u0412\u044B\u0436\u0438\u043B\u043E \u0436\u0438\u0442\u0435\u043B\u0435\u0439", `${alive} \u0438\u0437 ${POP_START}`], ["\u0426\u0435\u043D\u0430 \u0441\u043C\u0435\u043D\u044B", s.burnouts ? `${s.burnouts} \u043F\u0430\u0434\u0435\u043D\u0438\u0439` : tl > 25 ? "\u0442\u044F\u0436\u0451\u043B\u0430\u044F" : "\u043D\u0435\u0431\u043E\u043B\u044C\u0448\u0430\u044F"], ["\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0434\u044B\u043C", sm + "%"], ["\u041D\u043E\u0447\u0435\u0439 \u043F\u0435\u0440\u0435\u0436\u0438\u0442\u043E", `${Math.min(s.night + (s.phase === "ended" && s.ending !== "boom" && s.ending !== "silence" ? 1 : 0), 10)} \u0438\u0437 10`]];
    $("e-stats").innerHTML = items.map(() => '<div class="stat"><small></small><strong></strong></div>').join("");
    [...$("e-stats").querySelectorAll(".stat")].forEach((el2, i) => {
      el2.querySelector("small").textContent = items[i][0];
      el2.querySelector("strong").textContent = items[i][1];
    });
    const left = Object.keys(ENDINGS).length - meta.endings.length;
    const hints = { light: "\u042D\u0442\u043E \u043B\u0443\u0447\u0448\u0430\u044F \u043A\u043E\u043D\u0446\u043E\u0432\u043A\u0430. \u041E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u0446\u0435\u043D\u044B \u0442\u043E\u0436\u0435 \u0435\u0441\u0442\u044C \u2014 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u0440\u0438\u043D\u044F\u0442\u044C \xAB\u0432\u044B\u0433\u043E\u0434\u043D\u044B\u0435\xBB \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0438 \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0435, \u0447\u0435\u043C \u043F\u043B\u0430\u0442\u044F\u0442 \u0434\u0440\u0443\u0433\u0438\u0435.", smoke: "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043E\u0442\u043A\u0430\u0437\u0430\u0442\u044C\u0441\u044F \u043E\u0442 \u0431\u0443\u0440\u043E\u0433\u043E \u0443\u0433\u043B\u044F \u0438 \u0434\u0435\u0440\u0436\u0430\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u044B \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u043C\u0438.", iron: "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043D\u0435 \u043F\u0440\u043E\u0434\u043B\u0435\u0432\u0430\u0442\u044C \u0441\u043C\u0435\u043D\u0443 \u0438 \u0434\u0430\u0442\u044C \u0443\u0441\u0442\u0430\u043B\u043E\u0441\u0442\u0438 \u043E\u0441\u0442\u044B\u0442\u044C: \u0441\u043D\u0438\u0436\u0430\u0439\u0442\u0435 \u0432\u0435\u043D\u0442\u0438\u043B\u044C \u0437\u0430\u0432\u043E\u0434\u0430, \u043A\u043E\u0433\u0434\u0430 \u0448\u043A\u0430\u043B\u0430 \u043A\u0440\u0430\u0441\u043D\u0430\u044F.", cold: "\u0413\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044C \u0438 \u043A\u0432\u0430\u0440\u0442\u0430\u043B\u044B \u0432\u0430\u0436\u043D\u0435\u0435 \u0432\u0441\u0435\u0433\u043E. \u041D\u0435 \u0436\u0430\u043B\u0435\u0439\u0442\u0435 \u0438\u043C \u043F\u0430\u0440\u0430.", boom: "\u0421\u043B\u0435\u0434\u0438\u0442\u0435 \u0437\u0430 \u0441\u0442\u0440\u0435\u043B\u043A\u043E\u0439: \u0432 \u043A\u0440\u0430\u0441\u043D\u043E\u0439 \u0437\u043E\u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 \u0434\u0432\u0443\u0445 \u0441\u0435\u043A\u0443\u043D\u0434 \u2014 \u0432\u0437\u0440\u044B\u0432. \u041D\u0435 \u043F\u0435\u0440\u0435\u0431\u0430\u0440\u0449\u0438\u0432\u0430\u0439\u0442\u0435 \u0441 \u0443\u0433\u043B\u0451\u043C.", silence: "\u0414\u0435\u0440\u0436\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u0433\u043E\u0441\u043F\u0438\u0442\u0430\u043B\u044C \u0438 \u043A\u0432\u0430\u0440\u0442\u0430\u043B\u044B \u0432 \u0442\u0435\u043F\u043B\u0435 \u2014 \u0438 \u0443\u0442\u0435\u0447\u043A\u0438 \u0437\u0430\u0434\u0435\u043B\u044B\u0432\u0430\u0439\u0442\u0435 \u0441\u0440\u0430\u0437\u0443." };
    $("e-hint").textContent = hints[s.ending] + (left > 0 ? `  \u041E\u0442\u043A\u0440\u044B\u0442\u043E \u043A\u043E\u043D\u0446\u043E\u0432\u043E\u043A: ${meta.endings.length} \u0438\u0437 ${Object.keys(ENDINGS).length}.` : "  \u0412\u044B \u043E\u0442\u043A\u0440\u044B\u043B\u0438 \u0432\u0441\u0435 \u043A\u043E\u043D\u0446\u043E\u0432\u043A\u0438.");
    $("b-again").textContent = mp && mp.inGame ? "\u0412 \u043B\u043E\u0431\u0431\u0438 \u043A\u043E\u043C\u043D\u0430\u0442\u044B" : game.mode === "daily" ? "\u0415\u0449\u0451 \u043F\u043E\u043F\u044B\u0442\u043A\u0430" : "\u0421\u044B\u0433\u0440\u0430\u0442\u044C \u0441\u043D\u043E\u0432\u0430";
    $("e-share-msg").textContent = "";
    $("e-review").hidden = true;
    $("e-ach").hidden = true;
    $("e-daily").hidden = true;
    $("e-places").hidden = true;
    sound.play(tone === "good" ? "end-good" : tone === "fail" ? "end-fail" : "end-bitter");
    setupRank();
    endExtras();
  }
  function setupRank() {
    const box = $("e-rank");
    box.hidden = true;
    if (mp && mp.inGame)
      return;
    $("e-nick").value = store.get(NICK_KEY) || "";
    $("b-submit").disabled = false;
    $("b-submit").hidden = false;
    $("e-rank-msg").textContent = "";
    $("b-submit").textContent = game.mode === "daily" ? "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0432 \u0440\u0435\u0439\u0442\u0438\u043D\u0433 \u0434\u043D\u044F" : "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0432 \u0440\u0435\u0439\u0442\u0438\u043D\u0433";
    run.pending ? run.pending.then(() => {
      box.hidden = !run.online;
    }) : box.hidden = !run.online;
  }
  function playerId() {
    let id = store.get(PID_KEY);
    if (!id || !/^[0-9a-f]{24}$/.test(id)) {
      id = randomId();
      store.set(PID_KEY, id);
    }
    return id;
  }
  async function submitScore() {
    if (submitted)
      return;
    const nick = $("e-nick").value.trim();
    store.set(NICK_KEY, nick);
    const btn = $("b-submit"), msg = $("e-rank-msg");
    btn.disabled = true;
    msg.textContent = "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u043C\u2026";
    const daily = game.mode === "daily" && game.daily;
    const r = daily ? await run.submitDaily(endingResult(), nick, playerId(), game.daily.day) : await run.submit(endingResult(), nick, playerId());
    if (daily && r && r.ok && r.data && r.data.ok) {
      submitted = true;
      const me = r.data.me;
      msg.textContent = `\u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E \u043A\u0430\u043A \xAB${nick || "\u0410\u043D\u043E\u043D\u0438\u043C"}\xBB. ` + (me ? `\u0412\u0430\u0448 \u043B\u0443\u0447\u0448\u0438\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0434\u043D\u044F: ${me.score} \u043E\u0447\u043A., \u043C\u0435\u0441\u0442\u043E ${me.rank} \u0438\u0437 ${me.total}.` : "") + (r.data.done ? " \u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E!" : "");
      btn.hidden = true;
      boardAvailable = true;
    } else if (r && r.ok && r.data && r.data.ok) {
      submitted = true;
      msg.textContent = `\u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E \u043A\u0430\u043A \xAB${r.data.nick}\xBB. \u041C\u0435\u0441\u0442\u043E: ${r.data.rank.score} \u043F\u043E \u043E\u0447\u043A\u0430\u043C, ${r.data.rank.survival} \u043F\u043E \u0432\u044B\u0436\u0438\u0432\u0430\u043D\u0438\u044E.`;
      btn.hidden = true;
      boardAvailable = true;
      openBoard("score");
    } else {
      btn.disabled = false;
      msg.textContent = !r ? "\u041D\u0435\u0442 \u0441\u0432\u044F\u0437\u0438 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C \u0440\u0435\u0439\u0442\u0438\u043D\u0433\u0430. \u0418\u0433\u0440\u0430 \u043E\u0442 \u044D\u0442\u043E\u0433\u043E \u043D\u0435 \u0441\u0442\u0440\u0430\u0434\u0430\u0435\u0442 \u2014 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435." : r.status === 429 ? "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0447\u0430\u0441\u0442\u043E. \u041F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 \u043C\u0438\u043D\u0443\u0442\u0443." : r.status === 409 ? daily ? "\u042D\u0442\u043E\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0443\u0436\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D (\u0438\u043B\u0438 \u0434\u0435\u043D\u044C \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0441\u044F)." : "\u042D\u0442\u043E\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0443\u0436\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D." : r.status === 422 ? "\u0421\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 (\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0440\u0430\u0432\u0434\u043E\u043F\u043E\u0434\u043E\u0431\u0438\u044F)." : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442.";
    }
  }
  function updateBoardBtn() {
    $("b-board").hidden = !boardAvailable;
  }
  async function openBoard(which) {
    if (ui !== "board")
      openOverlay("board");
    boardCur = which || boardCur;
    document.querySelectorAll("#board .tab").forEach((b) => {
      const on = b.dataset.board === boardCur;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on);
    });
    const list = $("lb-list"), msg = $("lb-msg");
    list.textContent = "";
    msg.textContent = "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C\u2026";
    let entries = null, extra = "";
    if (boardCur === "season") {
      const r = await fetchSeason(playerId());
      if (r) {
        entries = r.entries;
        extra = `\u0421\u0435\u0437\u043E\u043D ${r.season}.` + (r.me ? ` \u0412\u0430\u0448\u0435 \u043C\u0435\u0441\u0442\u043E: ${r.me.rank} \u0438\u0437 ${r.me.total} (${r.me.score} \u043E\u0447\u043A.).` : "");
      }
    } else if (boardCur === "day") {
      const r = await fetchDailyBoard(game.daily ? game.daily.day : "", playerId());
      if (r) {
        entries = r.entries;
        extra = `\u0418\u0441\u043F\u044B\u0442\u0430\u043D\u0438\u0435 \u0434\u043D\u044F ${r.day}.` + (r.me ? ` \u0412\u0430\u0448\u0435 \u043C\u0435\u0441\u0442\u043E: ${r.me.rank} \u0438\u0437 ${r.me.total} (${r.me.score} \u043E\u0447\u043A.).` : "");
      }
    } else
      entries = await fetchBoard(boardCur);
    if (ui !== "board")
      return;
    if (!entries) {
      msg.textContent = "\u0420\u0435\u0439\u0442\u0438\u043D\u0433 \u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D.";
      return;
    }
    msg.textContent = (entries.length ? "" : "\u041F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E \u2014 \u0441\u0442\u0430\u043D\u044C\u0442\u0435 \u043F\u0435\u0440\u0432\u044B\u043C.") + (extra ? " " + extra : "");
    const byScore = boardCur !== "survival";
    entries.forEach((e) => {
      const li = document.createElement("li");
      const nick = document.createElement("b");
      nick.textContent = String(e.nick);
      const sc = document.createElement("span");
      sc.textContent = byScore ? `${e.score} \u043E\u0447\u043A.` : `${e.nights} \u043D\u043E\u0447. \xB7 ${e.pop} \u0436\u0438\u0442.`;
      const sub = document.createElement("small");
      sub.textContent = `${ENDINGS[e.ending] ? ENDINGS[e.ending].title : e.ending} \xB7 ${byScore ? `${e.nights} \u043D\u043E\u0447.` : `${e.score} \u043E\u0447\u043A.`}${e.done ? " \xB7 \u0437\u0430\u0434\u0430\u043D\u0438\u0435 \u2713" : ""}`;
      li.append(nick, sc, sub);
      list.append(li);
    });
  }
  function aggOf(rr2, extra = {}) {
    return { nights: rr2.nights, pop: rr2.pop, burnouts: rr2.burnouts, smog: rr2.smog, leaksFixed: Math.min(500, s.leaksFixed | 0), shovels: Math.min(3e3, (extra.shovels === void 0 ? s.shovels : extra.shovels) | 0), ending: rr2.ending, players: extra.players || 1, mode: extra.mode || game.mode };
  }
  function runCtx() {
    const rr2 = endingResult(), inMp = !!(mp && mp.inGame);
    const c = { mode: inMp ? mp.mode || "coop" : game.mode, ending: rr2.ending, nights: rr2.nights, pop: rr2.pop, burnouts: rr2.burnouts, smog: rr2.smog, score: rr2.score, leaksFixed: s.leaksFixed | 0 };
    if (!inMp) {
      c.shovels = s.shovels | 0;
      c.spills = s.spills | 0;
    } else if (c.mode === "versus") {
      const pl = mp.result && mp.result.places || [];
      const me = pl.find((x) => x.pid === mp.pid);
      c.players = pl.length;
      c.place = me ? me.place : 0;
      c.dnf = !!(me && me.dnf);
    } else
      c.players = mp.players.filter((p) => !p.bot).length;
    if (game.mode === "daily" && game.daily)
      c.questDone = questDone(game.daily.quest.goal, rr2);
    return c;
  }
  function showAchToasts(list) {
    if (!list.length)
      return;
    const box = $("ach-toast");
    let k = 0;
    const next = () => {
      if (k >= list.length) {
        box.hidden = true;
        return;
      }
      const a = list[k++];
      box.textContent = "";
      box.insertAdjacentHTML("beforeend", badge(a.icon, a.tier));
      const d = document.createElement("div");
      const b = document.createElement("b");
      b.textContent = "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0435: " + a.name;
      const sm = document.createElement("small");
      sm.textContent = a.desc;
      d.append(b, sm);
      box.append(d);
      box.hidden = false;
      $("sr-status").textContent = "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0435: " + a.name;
      setTimeout(next, 3200);
    };
    next();
  }
  function renderAchNew(list) {
    const ul = $("e-ach-list");
    ul.textContent = "";
    $("e-ach").hidden = !list.length;
    for (const a of list) {
      const li = document.createElement("li");
      li.insertAdjacentHTML("beforeend", badge(a.icon, a.tier));
      const b = document.createElement("b");
      b.textContent = a.name;
      const sm = document.createElement("small");
      sm.textContent = a.desc;
      li.append(b, sm);
      ul.append(li);
    }
  }
  function renderPlaces(result) {
    const box = $("e-places");
    if (!result || !result.places) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const ol = $("e-places-list");
    ol.textContent = "";
    for (const e of result.places) {
      const li = document.createElement("li");
      if (e.pid === (mp && mp.pid))
        li.className = "me";
      const nm = document.createElement("b");
      nm.textContent = e.nick + (e.pid === (mp && mp.pid) ? " (\u0432\u044B)" : "");
      const sc = document.createElement("span");
      sc.textContent = e.dnf ? "\u0432\u044B\u0448\u0435\u043B" : `${e.score} \u043E\u0447\u043A.`;
      const sm = document.createElement("small");
      sm.textContent = `${ENDINGS[e.ending] ? ENDINGS[e.ending].title : e.ending} \xB7 ${e.nights} \u043D\u043E\u0447. \xB7 ${e.pop} \u0436\u0438\u0442. \xB7 `;
      const v = document.createElement("i");
      v.className = e.verified ? "ok" : "no";
      v.textContent = e.dnf ? "" : e.verified ? "\u2713 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C" : "\u26A0 \u0441\u0435\u0440\u0432\u0435\u0440 \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043B \u0438\u043D\u0430\u0447\u0435";
      sm.append(v);
      li.append(nm, sc, sm);
      ol.append(li);
    }
  }
  function showReview(m) {
    if (!m || !m.text)
      return;
    game.review = m;
    const el = $("e-review");
    el.textContent = m.text;
    el.hidden = false;
    const sm = document.createElement("small");
    sm.textContent = m.src === "ai" ? "\u0420\u0430\u0437\u0431\u043E\u0440 \u043F\u0430\u0440\u0442\u0438\u0438 \xB7 \u0418\u0418" : "\u0420\u0430\u0437\u0431\u043E\u0440 \u043F\u0430\u0440\u0442\u0438\u0438 \xB7 \u043F\u043E \u043F\u0440\u0430\u0432\u0438\u043B\u0430\u043C";
    el.append(sm);
  }
  function endExtras() {
    renderBoardHud();
    const inMp = !!(mp && mp.inGame), versus = inMp && mp.mode === "versus";
    if (versus)
      renderPlaces(mp.result || livePlaces());
    if (inMp && game.review)
      showReview(game.review);
    if (game.counted)
      renderAchNew(game.fresh || []);
    else if (!(versus && !mp.result)) {
      game.counted = true;
      const ctx2 = runCtx(), rr2 = endingResult();
      const fresh = applyRun(meta, ctx2, { day: game.daily && game.daily.day });
      if (!meta.endings.includes(s.ending))
        meta.endings.push(s.ending);
      store.set(META_KEY, JSON.stringify(meta));
      game.fresh = fresh;
      renderAchNew(fresh);
      showAchToasts(fresh);
      if (!inMp && settings.stats)
        fetchReview(aggOf(rr2)).then((r) => {
          if (r && ui === "ending" && !game.review)
            showReview(r);
        }, () => {
        });
    }
    if (game.mode === "daily" && game.daily && !inMp) {
      const q = game.daily.quest, done = questDone(q.goal, endingResult());
      $("e-daily").hidden = false;
      $("e-daily-msg").textContent = `\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \xAB${q.title}\xBB: ${done ? "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E \u2713" : "\u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E \u2014 " + q.goal_text}.`;
    } else if (game.mode === "challenge" && !inMp) {
      const sc = endingResult().score;
      $("e-daily").hidden = false;
      $("e-daily-msg").textContent = game.chal ? sc > game.chal ? `\u0412\u044B\u0437\u043E\u0432 \u043F\u0440\u0438\u043D\u044F\u0442: ${sc} \u043F\u0440\u043E\u0442\u0438\u0432 ${game.chal} \u2014 \u0432\u044B \u043F\u043E\u0431\u0435\u0434\u0438\u043B\u0438!` : sc === game.chal ? `\u0412\u044B\u0437\u043E\u0432: ${sc} \u043F\u0440\u043E\u0442\u0438\u0432 ${game.chal} \u2014 \u043D\u0438\u0447\u044C\u044F.` : `\u0412\u044B\u0437\u043E\u0432: ${sc} \u043F\u0440\u043E\u0442\u0438\u0432 ${game.chal}. \u0427\u0443\u0442\u044C-\u0447\u0443\u0442\u044C \u043D\u0435 \u0445\u0432\u0430\u0442\u0438\u043B\u043E.` : "\u0412\u044B\u0437\u043E\u0432 \u043F\u0440\u0438\u043D\u044F\u0442. \u041F\u043E\u043A\u0430\u0436\u0438\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0434\u0440\u0443\u0433\u0443!";
    }
    $("b-share").hidden = false;
  }
  function livePlaces() {
    if (!mp || !mp.board)
      return null;
    return { places: mp.board.map((r, i) => ({ place: i + 1, pid: r.pid, nick: r.nick, score: r.score, nights: r.night, pop: r.pop, ending: r.ending || "silence", dnf: r.state === "dnf", verified: true })) };
  }
  async function shareResult() {
    const msg = $("e-share-msg");
    msg.textContent = "";
    const rr2 = endingResult(), inMp = !!(mp && mp.inGame);
    const mode = inMp ? mp.mode || "coop" : game.mode;
    const sc = inMp && mp.result && mp.result.score ? mp.result.score : rr2.score;
    const url = mode === "daily" ? dailyLink(location) : challengeLink(location, s.seed, sc);
    const mine = inMp && mp.result && mp.result.places ? mp.result.places.find((x) => x.pid === mp.pid) : null;
    const data = { score: mine ? mine.score : sc, nights: rr2.nights, pop: rr2.pop, endingTitle: ENDINGS[s.ending] ? ENDINGS[s.ending].title : "", mode, nick: store.get(NICK_KEY) || "", seed: s.seed, place: mine && !mine.dnf ? mine.place : 0 };
    const cv = drawShareCard($("share-cv"), data);
    const text2 = shareText({ mode, score: data.score, nights: rr2.nights, pop: rr2.pop });
    let how = "";
    try {
      const blob = await canvasToBlob(cv);
      const file = blob ? new File([blob], "last-boiler.png", { type: "image/png" }) : null;
      if (navigator.share && file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: text2, url });
        how = "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E.";
      } else if (navigator.share) {
        await navigator.share({ text: text2, url });
        how = "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E.";
      } else {
        if (blob) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "last-boiler.png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
          how = "\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430. ";
        }
        try {
          await navigator.clipboard.writeText(text2 + " " + url);
          how += "\u0421\u0441\u044B\u043B\u043A\u0430-\u0432\u044B\u0437\u043E\u0432 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0430.";
        } catch (e) {
          how += "\u0421\u0441\u044B\u043B\u043A\u0430-\u0432\u044B\u0437\u043E\u0432: " + url;
        }
      }
    } catch (e) {
      if (e && e.name === "AbortError")
        return;
      how = "\u0421\u0441\u044B\u043B\u043A\u0430-\u0432\u044B\u0437\u043E\u0432: " + url;
    }
    msg.textContent = how;
    const fresh = applyShare(meta);
    store.set(META_KEY, JSON.stringify(meta));
    showAchToasts(fresh);
  }
  function openAch() {
    openOverlay("ach");
    const have = ACHIEVEMENTS.filter((a) => meta.ach[a.id]).length;
    $("a-count").textContent = `\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u043E: ${have} \u0438\u0437 ${ACHIEVEMENTS.length}`;
    const ul = $("a-list");
    ul.textContent = "";
    for (const a of ACHIEVEMENTS) {
      const got = !!meta.ach[a.id], li = document.createElement("li");
      if (!got)
        li.className = "lock";
      li.insertAdjacentHTML("beforeend", badge(a.icon, a.tier, !got));
      const b = document.createElement("b");
      b.textContent = a.name;
      const sm = document.createElement("small");
      sm.textContent = a.desc + (got ? "" : " (\u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E)");
      li.append(b, sm);
      ul.append(li);
    }
  }
  async function openDaily() {
    openOverlay("daily");
    const play = $("d-play");
    play.disabled = true;
    $("d-msg").textContent = "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C\u2026";
    $("d-me").textContent = "";
    const info = await fetchDaily();
    if (ui !== "daily")
      return;
    if (!info) {
      $("d-msg").textContent = "\u0418\u0441\u043F\u044B\u0442\u0430\u043D\u0438\u0435 \u0434\u043D\u044F \u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E (\u043D\u0435\u0442 \u0441\u0432\u044F\u0437\u0438 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C). \u041E\u0431\u044B\u0447\u043D\u0430\u044F \u0438\u0433\u0440\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u043A\u0430\u043A \u0432\u0441\u0435\u0433\u0434\u0430.";
      $("d-title").textContent = "";
      $("d-story").textContent = "";
      $("d-goal").textContent = "";
      return;
    }
    game.daily = info;
    $("d-day").textContent = "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \xB7 " + info.day + " (UTC)";
    $("d-title").textContent = info.quest.title;
    $("d-story").textContent = info.quest.text || "";
    $("d-goal").textContent = "\u0417\u0430\u0434\u0430\u043D\u0438\u0435: " + info.quest.goal_text + ".";
    $("d-msg").textContent = "";
    play.disabled = false;
    const st = meta.st;
    if (st.streak > 0)
      $("d-me").textContent = `\u0421\u0435\u0440\u0438\u044F \u0434\u043D\u0435\u0439: ${st.streak}. `;
    const b = await fetchDailyBoard(info.day, playerId());
    if (ui === "daily" && b && b.me)
      $("d-me").textContent += `\u0412\u0430\u0448 \u043B\u0443\u0447\u0448\u0438\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u0435\u0433\u043E\u0434\u043D\u044F: ${b.me.score} \u043E\u0447\u043A., \u043C\u0435\u0441\u0442\u043E ${b.me.rank} \u0438\u0437 ${b.me.total}${b.me.done ? ", \u0437\u0430\u0434\u0430\u043D\u0438\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" : ""}.`;
  }
  function startDaily() {
    const info = game.daily;
    if (!info)
      return;
    newGame({ mode: "daily", seed: info.seed, daily: info, toast: ["\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u0434\u043D\u044F: " + info.quest.title, info.quest.goal_text] });
  }
  var incoming = challengeFromSearch(location.search);
  function showChallengeBanner() {
    const el = $("t-chal");
    if (!incoming)
      return;
    el.hidden = false;
    el.textContent = incoming.kind === "daily" ? "\u0412\u0430\u0441 \u0437\u043E\u0432\u0443\u0442 \u043D\u0430 \u0438\u0441\u043F\u044B\u0442\u0430\u043D\u0438\u0435 \u0434\u043D\u044F \u2014 \u043E\u0434\u0438\u043D \u0441\u0438\u0434 \u043D\u0430 \u0432\u0441\u0435\u0445, \u043B\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u0439\u0442\u0438\u043D\u0433 \u0434\u043D\u044F." : `\u0412\u0430\u043C \u0431\u0440\u043E\u0441\u0438\u043B\u0438 \u0432\u044B\u0437\u043E\u0432: \u0441\u0438\u0434 ${incoming.seed}${incoming.score ? ", \u043D\u0443\u0436\u043D\u043E \u043D\u0430\u0431\u0440\u0430\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 " + incoming.score + " \u043E\u0447\u043A." : ""}.`;
    const b = $("b-chal");
    b.hidden = false;
    b.textContent = incoming.kind === "daily" ? "\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u0432\u044B\u0437\u043E\u0432 \u0434\u043D\u044F" : "\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u0432\u044B\u0437\u043E\u0432";
  }
  function acceptChallenge() {
    if (!incoming)
      return;
    if (incoming.kind === "daily") {
      openDaily();
      return;
    }
    newGame({ mode: "challenge", seed: incoming.seed, chal: incoming.score, toast: ["\u0412\u044B\u0437\u043E\u0432 \u0434\u0440\u0443\u0433\u0430", incoming.score ? `\u041D\u0430\u0431\u0440\u0430\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 ${incoming.score} \u043E\u0447\u043A\u043E\u0432 \u043D\u0430 \u044D\u0442\u043E\u043C \u0441\u0438\u0434\u0435.` : "\u041E\u0434\u0438\u043D \u0441\u0438\u0434 \u043D\u0430 \u0434\u0432\u043E\u0438\u0445 \u2014 \u0441\u044B\u0433\u0440\u0430\u0439\u0442\u0435 \u043B\u0443\u0447\u0448\u0435."] });
  }
  var SESS_KEY = "last-boiler-mp-v1";
  var sstore = {
    get(k) {
      try {
        return sessionStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        sessionStorage.setItem(k, v);
      } catch (e) {
      }
    },
    del(k) {
      try {
        sessionStorage.removeItem(k);
      } catch (e) {
      }
    }
  };
  var mp = null;
  var lobbyUi = null;
  function mpEnsure() {
    if (!mp)
      mp = { client: null, mode: "coop", board: null, result: null, code: "", pid: "", nick: "", players: [], host: "", state: "lobby", max: 2, roles: null, mine: null, own: null, inGame: false, votes: {}, voted: [], acks: [], left: 0, paused: false, touch: [0, 0, 0, 0], sent: [0, 0, 0, 0], timers: [null, null, null, null], lastDeny: 0, lastShovel: 0, net: "idle", myVote: null, myAck: false };
    if (!mp.client)
      mp.client = new MpClient({ url: wsUrl(location.search, DEBUG), onMsg: mpOnMsg, onStatus: mpOnStatus });
    return mp;
  }
  function mpNick(raw) {
    const n = String(raw || "").trim().slice(0, 16);
    store.set(NICK_KEY, n);
    return n || "\u041A\u043E\u0447\u0435\u0433\u0430\u0440";
  }
  async function mpOpenSocket(first) {
    mpEnsure();
    lobbyUi.setBusy(true);
    lobbyUi.setStatus("\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0435\u043C\u0441\u044F\u2026");
    try {
      await mp.client.connect();
    } catch (e) {
      lobbyUi.setBusy(false);
      lobbyUi.setStatus("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u043A \u0441\u0435\u0440\u0432\u0435\u0440\u0443. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.", true);
      return;
    }
    if (first)
      mp.client.send(first);
  }
  function mpOpen() {
    $("mp-nick").value = store.get(NICK_KEY) || "";
    const want = roomFromSearch(location.search);
    if (want && !$("mp-code").value)
      $("mp-code").value = want;
    ui = "lobby";
    show("lobby");
    if (mp && mp.code)
      lobbyUi.renderRoom({ code: mp.code, players: mp.players, host: mp.host, state: mp.state, max: mp.max, mode: mp.mode }, mp.pid);
    else {
      lobbyUi.showEntry();
      lobbyUi.setBusy(false);
      lobbyUi.setStatus("");
    }
  }
  function mpInit() {
    lobbyUi = new LobbyUi($, {
      onCreate: (nick, max, mode) => mpOpenSocket({ t: "create", nick: mpNick(nick), max: max || 2, mode: mode === "versus" ? "versus" : "coop" }),
      onBot: (rm) => mp && mp.client.send({ t: rm ? "rmbot" : "addbot" }),
      onShare: async () => {
        const link = inviteLink(location, mp.code);
        try {
          await navigator.share({ title: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043A\u043E\u0442\u0451\u043B", text: `\u0417\u0430\u0445\u043E\u0434\u0438 \u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u0443 ${mp.code} \u2014 ${(MODE_NAMES[mp.mode] || "").toLowerCase()}!`, url: link });
        } catch (e) {
        }
      },
      onJoin: (nick, code) => {
        code = normalizeCode(code);
        if (!CODE_RE.test(code)) {
          lobbyUi.setStatus("\u041A\u043E\u0434 \u043A\u043E\u043C\u043D\u0430\u0442\u044B \u2014 5 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 K7M2P.", true);
          return;
        }
        mpOpenSocket({ t: "join", code, nick: mpNick(nick) });
      },
      onReady: () => {
        const me = mp && mp.players.find((p) => p.pid === mp.pid);
        mp.client.send({ t: "ready", ready: !(me && me.ready) });
      },
      onStart: () => mp.client.send({ t: mp.state === "ended" ? "again" : "start" }),
      onLeave: () => mpLeave(false),
      onBack: () => mpLeave(true),
      onKick: (pid) => mp.client.send({ t: "kick", pid }),
      onChat: (text2) => mp && mp.client.send({ t: "chat", text: text2 }),
      onEmo: (e) => mp && mp.client.send({ t: "emo", e }),
      onCopy: async () => {
        const link = inviteLink(location, mp.code);
        try {
          await navigator.clipboard.writeText(link);
          lobbyUi.setStatus("\u0421\u0441\u044B\u043B\u043A\u0430 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0430: " + link);
        } catch (e) {
          lobbyUi.setStatus("\u0421\u0441\u044B\u043B\u043A\u0430 \u0434\u043B\u044F \u0434\u0440\u0443\u0437\u0435\u0439: " + link);
        }
      }
    });
    $("mp-chatin").addEventListener("keydown", (e) => {
      if (e.key === "Escape")
        lobbyUi.toggleChat(false);
    });
    let sess = null;
    try {
      sess = JSON.parse(sstore.get(SESS_KEY) || "null");
    } catch (e) {
    }
    const want = roomFromSearch(location.search);
    if (sess && CODE_RE.test(sess.code) && (!want || want === sess.code)) {
      mpEnsure();
      mp.code = sess.code;
      mp.pid = sess.pid;
      mp.nick = sess.nick;
      mp.client.setSession({ code: sess.code, pid: sess.pid, secret: sess.secret });
      ui = "lobby";
      show("lobby");
      lobbyUi.setStatus("\u0412\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u043C\u0441\u044F \u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u0443\u2026");
      lobbyUi.hud(true);
      mp.client.connect().catch(() => mpReset("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u0443."));
    } else if (want)
      mpOpen();
  }
  function mpOnStatus(st) {
    if (!mp)
      return;
    mp.net = st;
    const el = $("mp-net");
    if (st === "reconnecting") {
      el.textContent = "\u0421\u0432\u044F\u0437\u044C \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u0430 \u2014 \u043F\u0435\u0440\u0435\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0435\u043C\u0441\u044F\u2026";
      el.hidden = false;
    } else if (st === "lost")
      mpReset("\u0421\u0432\u044F\u0437\u044C \u0441 \u043A\u043E\u043C\u043D\u0430\u0442\u043E\u0439 \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u0430.");
    else
      mpRefreshNet();
  }
  function mpRefreshNet() {
    const el = $("mp-net");
    if (!mp) {
      el.hidden = true;
      return;
    }
    if (mp.net === "reconnecting")
      return;
    const wait = mp.inGame && mp.paused;
    el.textContent = wait ? "\u041F\u0430\u0443\u0437\u0430: \u0436\u0434\u0451\u043C \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0432\u0448\u0435\u0433\u043E\u0441\u044F \u0438\u0433\u0440\u043E\u043A\u0430 (\u0434\u043E 60 \u0441)\u2026" : "";
    el.hidden = !wait;
  }
  function mpReset(msg) {
    if (mp) {
      try {
        mp.client.close();
      } catch (e) {
      }
      for (const t of mp.timers)
        clearTimeout(t);
    }
    sstore.del(SESS_KEY);
    mp = null;
    if (lobbyUi) {
      lobbyUi.hud(false);
      lobbyUi.clearChat();
    }
    $("mp-net").hidden = true;
    $("mp-role").hidden = true;
    $("c-vote").hidden = true;
    $("mp-board").hidden = true;
    if (s.phase !== "ended" || ui === "lobby") {
    }
    sound.silence();
    ui = "title";
    updateTitle();
    if (msg)
      $("t-endings").textContent = msg;
    show("title");
  }
  function mpLeave(toTitle) {
    if (!mp)
      return;
    if (mp.client)
      mp.client.send({ t: "leave" });
    if (toTitle) {
      mpReset("");
      return;
    }
    mp.code = "";
    mp.players = [];
    sstore.del(SESS_KEY);
    mp.client.setSession(null);
    mp.inGame = false;
    lobbyUi.clearChat();
    lobbyUi.hud(false);
    lobbyUi.showEntry();
    lobbyUi.setBusy(false);
    lobbyUi.setStatus("\u0412\u044B \u0432\u044B\u0448\u043B\u0438 \u0438\u0437 \u043A\u043E\u043C\u043D\u0430\u0442\u044B.");
    ui = "lobby";
    show("lobby");
  }
  function mpLeaveAsk() {
    if (confirm("\u041F\u043E\u043A\u0438\u043D\u0443\u0442\u044C \u043A\u043E\u043C\u043D\u0430\u0442\u0443? \u041E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0442 \u0431\u0435\u0437 \u0432\u0430\u0441."))
      mpLeave(true);
  }
  function mpBackToLobby() {
    $("mp-board").hidden = true;
    if (mp.host === mp.pid && mp.state === "ended")
      mp.client.send({ t: "again" });
    mp.inGame = false;
    lobbyUi.hud(true);
    mpOpen();
  }
  function mpDeny(what) {
    const now = performance.now();
    if (now - mp.lastDeny < 1500)
      return;
    mp.lastDeny = now;
    showToast("\u042D\u0442\u043E \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0438\u0433\u0440\u043E\u043A\u0430", what, "#e0b866", 3);
  }
  function mpOwnerLabel(i) {
    const o = mp.own && mp.own.valve[i];
    return DISTRICTS[i].name + ": " + (o ? o.nick : "\u043D\u0438\u043A\u0442\u043E");
  }
  function mpValve(i) {
    mp.touch[i] = performance.now();
    const send = () => {
      mp.timers[i] = null;
      mp.sent[i] = performance.now();
      mp.client.send({ t: "valve", i, v: s.valves[i] });
    };
    const wait = 60 - (performance.now() - mp.sent[i]);
    if (wait <= 0)
      send();
    else if (!mp.timers[i])
      mp.timers[i] = setTimeout(send, wait);
  }
  function mpRoles(roles) {
    mp.roles = roles;
    mp.own = ownership(roles, mp.players);
    mp.mine = roles[mp.pid] || { valves: [], shovel: false, leaks: false };
    const el = $("mp-role");
    el.textContent = "\u0412\u044B: " + (roleSummary(mp.mine) || "\u043D\u0430\u0431\u043B\u044E\u0434\u0430\u0442\u0435\u043B\u044C");
    el.hidden = false;
  }
  function mpStartGame(m) {
    mpRoles(m.roles);
    coach.reset();
    notes.reset();
    toast = null;
    mp.mode = m.mode === "versus" ? "versus" : "coop";
    mp.result = null;
    mp.board = null;
    game.counted = false;
    game.review = null;
    game.fresh = [];
    game.mode = "solo";
    game.daily = null;
    s = createState(m.seed, { skipTutorial: true, host: true });
    lastPhase = null;
    lastNight = -1;
    snap = null;
    playTime = 0;
    endTimer = 0;
    log = [];
    fx.clear();
    banner = null;
    vis.satShown = [1, 1, 1, 1];
    vis.popShown = POP_START;
    vis.needle = s.P;
    vis.fireShown = 0;
    mp.inGame = true;
    mp.myVote = null;
    mp.myAck = false;
    mp.paused = false;
    sound.ensure();
    sound.startMusic();
    lobbyUi.hud(true);
    ui = "play";
    show(null);
    say("\u0410\u0433\u0430\u0444\u044C\u044F", mp.mode === "versus" ? "\u0413\u043E\u043D\u043A\u0430! \u0423 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0441\u0432\u043E\u0439 \u043A\u043E\u0442\u0451\u043B \u0438 \u043E\u0431\u0449\u0438\u0439 \u0441\u0438\u0434 \u2014 \u0432\u044B\u0438\u0433\u0440\u044B\u0432\u0430\u0435\u0442 \u0442\u043E\u0442, \u0443 \u043A\u043E\u0433\u043E \u0431\u043E\u043B\u044C\u0448\u0435 \u043E\u0447\u043A\u043E\u0432." : "\u0412\u044B \u0443 \u043E\u0434\u043D\u043E\u0433\u043E \u043A\u043E\u0442\u043B\u0430: \u043A\u0430\u0436\u0434\u044B\u0439 \u0432\u0435\u0434\u0451\u0442 \u0441\u0432\u043E\u044E \u0447\u0430\u0441\u0442\u044C. \u0413\u043E\u0432\u043E\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433 \u0441 \u0434\u0440\u0443\u0433\u043E\u043C (T)!", "talk", "#e39a62");
    renderBoardHud();
  }
  function mpApplySnap(m) {
    const d = m.s, keep = s.valves.slice(), now = performance.now(), prevPhase = s.phase;
    Object.assign(s, d);
    s.card = d.card ? Object.values(CARDS).find((c) => c.id === d.card) || null : null;
    if (s.phase === "night") {
      for (const i of mp.mine.valves)
        if (now - mp.touch[i] < 500)
          s.valves[i] = keep[i];
    }
    mp.votes = m.votes || {};
    mp.voted = m.voted || [];
    mp.acks = m.acks || [];
    mp.left = m.left | 0;
    mp.paused = !!m.paused;
    if (s.phase !== prevPhase) {
      mp.myVote = null;
      mp.myAck = false;
    }
    for (const e of m.ev || [])
      s.events.push(e);
    handleEvents();
    trackPhase();
    mpRefresh();
    mpRefreshNet();
  }
  function mpRefresh() {
    if (!mp || !mp.inGame)
      return;
    const online = mp.players.filter((p) => p.online).length || mp.players.length;
    if (ui === "card") {
      const v = $("c-vote");
      v.hidden = false;
      if (mp.mode === "versus")
        v.textContent = `\u0420\u0435\u0448\u0435\u043D\u0438\u0435 \u0437\u0430 \u0432\u0430\u043C\u0438 \u2014 \u0432 \u0441\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u043D\u0438\u0438 \u0443 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0441\u0432\u043E\u0439 \u043A\u043E\u0442\u0451\u043B. \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C ${mp.left} \u0441.`;
      else
        v.textContent = `\u041F\u0440\u043E\u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043B\u0438: ${mp.voted.length} \u0438\u0437 ${online}. \u0420\u0435\u0448\u0430\u0435\u0442 \u0431\u043E\u043B\u044C\u0448\u0438\u043D\u0441\u0442\u0432\u043E; \u043F\u0440\u0438 \u043D\u0438\u0447\u044C\u0435\u0439 \u2014 \u043F\u0435\u0440\u0432\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442. \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C ${mp.left} \u0441.`;
      [...$("c-opts").children].forEach((b, i) => {
        const o = s.card && s.card.options[i];
        b.classList.toggle("picked", !!(o && mp.myVote === o.key));
      });
    } else
      $("c-vote").hidden = true;
    if (ui === "summary") {
      const b = $("b-next"), last2 = s.summary && s.summary.night + 1 >= NIGHTS.length;
      const acked = mp.myAck || mp.acks.includes(mp.pid);
      b.disabled = acked;
      b.textContent = acked ? mp.mode === "versus" ? "\u0414\u0430\u043B\u044C\u0448\u0435\u2026" : `\u0416\u0434\u0451\u043C \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0445 (${mp.acks.length}/${online})` : `${last2 ? "\u0412\u0441\u0442\u0440\u0435\u0442\u0438\u0442\u044C \u043E\u0431\u043E\u0437" : "\u0414\u0430\u043B\u044C\u0448\u0435"} (${mp.left})`;
    } else
      $("b-next").disabled = false;
  }
  function renderBoardHud() {
    const el = $("mp-board");
    if (!mp || !mp.inGame || mp.mode !== "versus" || !mp.board || ui === "ending" || ui === "lobby") {
      el.hidden = true;
      return;
    }
    const rows = boardView(mp.board, mp.pid);
    el.textContent = "";
    const ol = document.createElement("ol");
    for (const r of rows) {
      const li = document.createElement("li");
      if (r.me)
        li.className = "me";
      const n = document.createElement("i");
      n.textContent = r.place;
      n.style.fontStyle = "normal";
      const b = document.createElement("b");
      b.textContent = r.nick;
      const sc = document.createElement("span");
      sc.textContent = r.score;
      const sm = document.createElement("small");
      sm.textContent = r.state === "playing" ? `\u043D\u043E\u0447\u044C ${r.night} \xB7 ${r.pop} \u0436\u0438\u0442.` : r.state === "done" ? "\u0444\u0438\u043D\u0438\u0448" : r.state === "dnf" ? "\u0432\u044B\u0448\u0435\u043B" : "\u043D\u0435\u0442 \u0441\u0432\u044F\u0437\u0438";
      li.append(n, b, sc, sm);
      ol.append(li);
    }
    el.append(ol);
    el.hidden = false;
  }
  function mpOnMsg(m) {
    if (!mp)
      return;
    switch (m.t) {
      case "joined":
        mp.code = m.code;
        mp.pid = m.pid;
        mp.nick = m.nick;
        mp.client.setSession({ code: m.code, pid: m.pid, secret: m.secret });
        sstore.set(SESS_KEY, JSON.stringify({ code: m.code, pid: m.pid, secret: m.secret, nick: m.nick }));
        lobbyUi.clearChat();
        (m.chat || []).forEach((c) => lobbyUi.addChat(c));
        lobbyUi.hud(true);
        lobbyUi.setBusy(false);
        if (!mp.inGame) {
          ui = "lobby";
          show("lobby");
        }
        break;
      case "lobby":
        mp.players = m.players;
        mp.host = m.host;
        mp.state = m.state;
        mp.max = m.max;
        mp.mode = m.mode === "versus" ? "versus" : "coop";
        if (mp.inGame && m.state === "playing")
          mpRoles(Object.fromEntries(m.players.filter((p) => p.role).map((p) => [p.pid, p.role])));
        lobbyUi.renderRoom(m, mp.pid);
        if (m.state === "lobby" && mp.inGame) {
          mp.inGame = false;
          sound.silence();
          ui = "lobby";
          show("lobby");
        }
        break;
      case "start":
        if (!mp.inGame)
          mpStartGame(m);
        else
          mpRoles(m.roles);
        break;
      case "snap":
        if (mp.inGame)
          mpApplySnap(m);
        break;
      case "chat":
        lobbyUi.addChat(m);
        break;
      case "emo":
        lobbyUi.floatEmoji(m);
        break;
      case "end":
        mp.result = m.result;
        if (m.result && m.result.mode === "versus" && ui === "ending") {
          renderPlaces(m.result);
          endExtras();
        }
        renderBoardHud();
        break;
      case "board":
        mp.board = Array.isArray(m.rows) ? m.rows : null;
        renderBoardHud();
        break;
      case "review":
        game.review = { text: String(m.text || "").slice(0, 900), src: m.src === "ai" ? "ai" : "rules" };
        if (ui === "ending")
          showReview(game.review);
        break;
      case "left":
        mpReset({ kicked: "\u0425\u043E\u0437\u044F\u0438\u043D \u0443\u0431\u0440\u0430\u043B \u0432\u0430\u0441 \u0438\u0437 \u043A\u043E\u043C\u043D\u0430\u0442\u044B.", timeout: "\u0412\u044B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043E\u043B\u0433\u043E \u0431\u044B\u043B\u0438 \u0431\u0435\u0437 \u0441\u0432\u044F\u0437\u0438 \u2014 \u043C\u0435\u0441\u0442\u043E \u043E\u0441\u0432\u043E\u0431\u043E\u0436\u0434\u0435\u043D\u043E.", room_closed: "\u041A\u043E\u043C\u043D\u0430\u0442\u0430 \u0437\u0430\u043A\u0440\u044B\u0442\u0430.", replaced: "\u0412\u044B \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u043B\u0438\u0441\u044C \u0441 \u0434\u0440\u0443\u0433\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0438." }[m.reason] || "");
        break;
      case "err":
        lobbyUi.setBusy(false);
        if (m.code === "no_such_room" && !mp.inGame && (mp.client.session || mp.code) && !$("mp-room").hidden === false && ui === "lobby" && mp.code && mp.players.length === 0) {
          mpReset("\u041A\u043E\u043C\u043D\u0430\u0442\u0430 \u0443\u0436\u0435 \u0437\u0430\u043A\u0440\u044B\u0442\u0430.");
          break;
        }
        if (m.code === "forbidden")
          break;
        if (ui === "lobby")
          lobbyUi.setStatus(errText(m.code), true);
        else
          showToast("\u041A\u043E\u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432", errText(m.code), "#e0523c", 4);
        break;
      default:
        break;
    }
  }
  function wire() {
    const click = (id, fn) => $(id).addEventListener("click", () => {
      sound.ensure();
      sound.play("click");
      fn();
    });
    click("b-new", newGame);
    click("b-continue", continueGame);
    click("b-board", () => openBoard("score"));
    click("b-lbclose", closeOverlay);
    click("b-submit", submitScore);
    document.querySelectorAll("#board .tab").forEach((b) => b.addEventListener("click", () => {
      sound.ensure();
      sound.play("click");
      openBoard(b.dataset.board);
    }));
    $("o-stats").addEventListener("change", (e) => {
      settings.stats = e.target.checked;
      applySettings();
    });
    click("b-help", () => openOverlay("help"));
    click("b-settings", () => openOverlay("settings"));
    click("b-start", startPlay);
    click("b-resume", resumeGame);
    click("b-retry", retryNight);
    click("b-menu", goMenu);
    click("b-pset", () => openOverlay("settings"));
    click("b-phelp", () => openOverlay("help"));
    click("b-sclose", closeOverlay);
    click("b-hclose", closeOverlay);
    click("b-next", () => {
      if (mp && mp.inGame) {
        mp.client.send({ t: "next" });
        mp.myAck = true;
        mpRefresh();
        return;
      }
      continueSummary(s);
      handleEvents();
      trackPhase();
    });
    click("b-again", () => {
      if (mp && mp.inGame) {
        mpBackToLobby();
        return;
      }
      newGame();
    });
    click("b-emenu", () => {
      if (mp) {
        mpLeave(true);
        return;
      }
      ui = "title";
      updateTitle();
      show("title");
    });
    click("b-mp", mpOpen);
    click("b-daily", openDaily);
    click("b-ach", openAch);
    click("a-close", closeOverlay);
    click("b-chal", acceptChallenge);
    click("b-share", shareResult);
    click("d-play", startDaily);
    click("d-close", closeOverlay);
    click("d-board", () => openBoard("day"));
    click("d-share", () => {
      const url = dailyLink(location);
      (navigator.share ? navigator.share({ text: "\u0418\u0441\u043F\u044B\u0442\u0430\u043D\u0438\u0435 \u0434\u043D\u044F \u0432 \xAB\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u043C \u043A\u043E\u0442\u043B\u0435\xBB: \u043E\u0434\u0438\u043D \u0441\u0438\u0434 \u043D\u0430 \u0432\u0441\u0435\u0445. \u041F\u043E\u0431\u044C\u0451\u0442\u0435?", url }) : navigator.clipboard.writeText(url).then(() => {
        $("d-msg").textContent = "\u0421\u0441\u044B\u043B\u043A\u0430 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0430: " + url;
      })).catch(() => {
        $("d-msg").textContent = "\u0421\u0441\u044B\u043B\u043A\u0430: " + url;
      });
    });
    click("b-wipe", () => {
      if (confirm("\u0421\u0442\u0435\u0440\u0435\u0442\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435, \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u043A\u043E\u043D\u0446\u043E\u0432\u043A\u0438 \u0438 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F?")) {
        store.del(SAVE_KEY);
        meta = cleanMeta(null);
        store.set(META_KEY, JSON.stringify(meta));
        updateTitle();
      }
    });
    $("o-sound").addEventListener("change", (e) => {
      settings.sound = e.target.checked;
      applySettings();
      sound.ensure();
      sound.play("click");
    });
    $("o-sfx").addEventListener("input", (e) => {
      settings.sfx = +e.target.value;
      applySettings();
      sound.ensure();
      sound.play("valve", 0.5);
    });
    $("o-music").addEventListener("input", (e) => {
      settings.music = +e.target.value;
      applySettings();
    });
    $("o-reduce").addEventListener("change", (e) => {
      settings.reduce = e.target.checked;
      applySettings();
    });
    $("o-shake").addEventListener("change", (e) => {
      settings.shake = e.target.checked;
      applySettings();
    });
    $("o-sound").checked = settings.sound;
    $("o-stats").checked = settings.stats;
    $("o-sfx").value = settings.sfx;
    $("o-music").value = settings.music;
    $("o-reduce").checked = settings.reduce;
    $("o-shake").checked = settings.shake;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        pauseGame();
        sound.silence();
      }
    });
    window.addEventListener("blur", () => {
      if (ui === "play")
        pauseGame();
    });
    ["pointerup", "touchend", "click", "keydown"].forEach((ev) => document.addEventListener(ev, () => {
      sound.unlock();
      schedulePill();
    }, { capture: true, passive: true }));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        sound.resumeIfNeeded();
        schedulePill();
      }
    });
    window.addEventListener("pageshow", () => {
      sound.resumeIfNeeded();
      schedulePill();
    });
    window.addEventListener("focus", () => {
      sound.resumeIfNeeded();
      schedulePill();
    });
    sound.onState = () => updatePill();
    $("b-snd").addEventListener("click", () => {
      sound.unlock();
      sound.play("click");
      schedulePill(300);
    });
    setInterval(updatePill, 1500);
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    if (window.visualViewport)
      window.visualViewport.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", () => setTimeout(resize, 120));
    if (mq.addEventListener)
      mq.addEventListener("change", (e) => {
        settings.reduce = e.matches;
        $("o-reduce").checked = e.matches;
        applySettings();
      });
  }
  function toLogical(ev) {
    const r = canvas.getBoundingClientRect();
    return [(ev.clientX - r.left) / view.scale - L.offX, (ev.clientY - r.top) / view.scale];
  }
  var inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  function pauseHit() {
    const p = L.pause, m = Math.max(p.w, 46 / view.scale), cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    return { x: cx - m / 2, y: Math.max(0, cy - m / 2), w: m, h: m };
  }
  function leakR() {
    return Math.max(32, 23 / view.scale);
  }
  function hitPause(x, y) {
    const r = pauseHit();
    return x >= r.x && x <= r.x + r.w + 12 && y >= r.y && y <= r.y + r.h;
  }
  function valveFromY(i, y) {
    const c = column(L, i);
    return Math.max(0, Math.min(1, (c.ty1 - y) / (c.ty1 - c.ty0)));
  }
  function setV(i, v) {
    if (mp && mp.inGame && !mp.mine.valves.includes(i)) {
      mpDeny(mpOwnerLabel(i));
      return;
    }
    v = Math.round(v * 100) / 100;
    if (Math.abs(v - s.valves[i]) < 5e-3)
      return;
    setValve(s, i, v);
    sound.play("valve", v);
    vis.wheelKick[i] += (v - s.valves[i]) * 3;
    if (mp && mp.inGame)
      mpValve(i);
  }
  function adjV(i, dv) {
    if (mp && mp.inGame && !mp.mine.valves.includes(i)) {
      mpDeny(mpOwnerLabel(i));
      return;
    }
    const before = s.valves[i];
    adjustValve(s, i, dv);
    if (s.valves[i] !== before) {
      sound.play("valve", s.valves[i]);
      vis.wheelKick[i] += dv * 6;
      if (mp && mp.inGame)
        mpValve(i);
    }
  }
  function actShovel() {
    input.shovelDown = 0.15;
    if (mp && mp.inGame) {
      if (!mp.mine.shovel) {
        mpDeny("\u041B\u043E\u043F\u0430\u0442\u0430: " + (mp.own.shovel ? mp.own.shovel.nick : "\u043D\u0438\u043A\u0442\u043E"));
        return;
      }
      const now = performance.now();
      if (now - mp.lastShovel > 120) {
        mp.lastShovel = now;
        mp.client.send({ t: "shovel" });
      }
      return;
    }
    shovel(s);
    handleEvents();
  }
  function actFix(id) {
    if (mp && mp.inGame) {
      if (!mp.mine.leaks) {
        mpDeny("\u0423\u0442\u0435\u0447\u043A\u0438: " + (mp.own.leaks ? mp.own.leaks.nick : "\u043D\u0438\u043A\u0442\u043E"));
        return;
      }
      mp.client.send({ t: "fix", id: id == null ? null : id });
      return;
    }
    if (fixLeak(s, id))
      handleEvents();
  }
  canvas.addEventListener("pointerdown", (ev) => {
    var _a;
    sound.ensure();
    if (ui !== "play")
      return;
    const [x, y] = toLogical(ev);
    (_a = canvas.setPointerCapture) == null ? void 0 : _a.call(canvas, ev.pointerId);
    if (hitPause(x, y)) {
      if (mp && mp.inGame)
        mpLeaveAsk();
      else
        pauseGame();
      return;
    }
    for (const lk of s.leaks) {
      const c = column(L, lk.pipe);
      if (Math.hypot(x - c.leak.x, y - c.leak.y) < leakR()) {
        actFix(lk.id);
        return;
      }
    }
    if (inRect(x, y, L.shovel)) {
      actShovel();
      return;
    }
    for (let i = 0; i < 4; i++) {
      const c = column(L, i);
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        input.sel = i;
        if (y > c.y + c.head - 6 && y < c.ty1 + 22) {
          input.drag = i;
          setV(i, valveFromY(i, y));
        }
        return;
      }
    }
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (ui !== "play")
      return;
    const [x, y] = toLogical(ev);
    if (input.drag >= 0) {
      setV(input.drag, valveFromY(input.drag, y));
      return;
    }
    let over = inRect(x, y, L.shovel) || hitPause(x, y);
    for (const lk of s.leaks) {
      const c = column(L, lk.pipe);
      if (Math.hypot(x - c.leak.x, y - c.leak.y) < leakR())
        over = true;
    }
    for (let i = 0; i < 4 && !over; i++) {
      const c = column(L, i);
      if (x >= c.x && x <= c.x + c.w && y >= c.ty0 - 20 && y <= c.ty1 + 20)
        over = true;
    }
    canvas.style.cursor = over ? "pointer" : "default";
  });
  var endDrag = () => {
    input.drag = -1;
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("wheel", (ev) => {
    if (ui !== "play")
      return;
    const [x, y] = toLogical(ev);
    for (let i = 0; i < 4; i++) {
      const c = column(L, i);
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        adjV(i, ev.deltaY < 0 ? 0.05 : -0.05);
        input.sel = i;
        ev.preventDefault();
      }
    }
  }, { passive: false });
  window.addEventListener("keydown", (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || shouldIgnoreKey(ev.target))
      return;
    const k = ev.key;
    sound.ensure();
    if (k === "m" || k === "M" || k === "\u044C" || k === "\u042C") {
      settings.sound = !settings.sound;
      $("o-sound").checked = settings.sound;
      applySettings();
      return;
    }
    if (mp && mp.inGame && (k === "t" || k === "T" || k === "\u0435" || k === "\u0415") && (ui === "play" || ui === "card" || ui === "summary")) {
      ev.preventDefault();
      lobbyUi.toggleChat(true);
      return;
    }
    if (ui === "card") {
      if (k === "1" || k === "2") {
        const o = s.card.options[+k - 1];
        if (o) {
          ev.preventDefault();
          pickCard(o.key);
        }
      }
      return;
    }
    if (ui === "settings" || ui === "help" || ui === "board" || ui === "daily" || ui === "ach") {
      if (k === "Escape")
        closeOverlay();
      return;
    }
    if (ui === "pause") {
      if (k === "Escape" || k === "p" || k === "P" || k === "\u0437" || k === "\u0417")
        resumeGame();
      return;
    }
    if (ui !== "play")
      return;
    if (k === "Escape" || k === "p" || k === "P" || k === "\u0437" || k === "\u0417") {
      pauseGame();
      return;
    }
    if (k === " " || k === "Spacebar") {
      ev.preventDefault();
      actShovel();
      return;
    }
    if (k >= "1" && k <= "4") {
      input.sel = +k - 1;
      return;
    }
    const nav = { ArrowLeft: -1, ArrowRight: 1, a: -1, d: 1, \u0444: -1, \u0432: 1 };
    if (nav[k] !== void 0) {
      ev.preventDefault();
      input.sel = (input.sel + nav[k] + 4) % 4;
      return;
    }
    const ud = { ArrowUp: 1, ArrowDown: -1, w: 1, s: -1, \u0446: 1, \u044B: -1, PageUp: 5, PageDown: -5 };
    if (ud[k] !== void 0) {
      ev.preventDefault();
      adjV(input.sel, ud[k] * (ev.shiftKey ? 0.2 : 0.05));
      return;
    }
    if (k === "f" || k === "F" || k === "\u0430" || k === "\u0410" || k === "Enter")
      actFix(null);
  });
  function update(dt) {
    if (s.phase === "night") {
      let ch = false;
      for (let i = 0; i < 4; i++) {
        vstat.sum[i] += s.valves[i] * dt;
        if (Math.abs(s.valves[i] - vstat.prev[i]) > 4e-3) {
          ch = true;
          vstat.prev[i] = s.valves[i];
        }
      }
      vstat.t += dt;
      if (ch && !vstat.moving)
        vstat.moves++;
      vstat.moving = ch;
    }
    if (dbg.bot && s.phase === "night") {
      botAct(s, dbg.bot, dbg.botOpts);
    }
    step(s, dt);
    if (s.phase === "night") {
      const h = coach.update(s, dt);
      if (h)
        showHint(h);
      const q = notes.update(s, dt);
      if (q)
        requestNote(q);
    }
    if (s.shake > 0.6) {
      fx.shake(s.shake);
    }
    handleEvents();
    trackPhase();
  }
  function visUpdate(dt, playing) {
    vis.t += dt;
    time += dt;
    const k = Math.min(1, dt * 7);
    vis.needle += (s.P - vis.needle) * k;
    vis.fireShown += (s.fire - vis.fireShown) * Math.min(1, dt * 10);
    for (let i = 0; i < 4; i++) {
      vis.satShown[i] += (s.sat[i] - vis.satShown[i]) * Math.min(1, dt * 6);
      vis.wheelKick[i] *= Math.max(0, 1 - dt * 10);
    }
    vis.popShown += (s.pop - vis.popShown) * Math.min(1, dt * 3);
    vis.swing = Math.max(0, vis.swing - dt * 4);
    vis.kidSwing = Math.max(0, vis.kidSwing - dt * 4);
    input.shovelDown = Math.max(0, input.shovelDown - dt);
    const steamUse = s.flow.reduce((a, b) => a + b, 0);
    const sp = fx.reduced ? 0.15 : 1;
    for (const g of gears)
      g.rot += g.dir * dt * (0.15 + steamUse * 0.07 + s.P * 4e-3) * (12 / g.n) * sp * (playing ? 1 : 0.3);
    for (const f of vis.snow) {
      f.y += f.v * dt * (1 + s.smog / 200);
      f.x += f.dx * dt;
      if (f.y > 90) {
        f.y = 0;
        f.x = rnd() * 1400;
      }
    }
    fx.update(dt);
  }
  var fxAcc = 0;
  function render() {
    const cssW = canvas.width / dpr, cssH = canvas.height / dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bg)
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    const [sx, sy] = fx.shakeOffset();
    ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, (L.offX * view.scale + sx) * dpr, sy * dpr);
    fxAcc += 1;
    const R = { s, L, vis, input, log, toast, time, banner, fx, city, gears, reduced: fx.reduced, dpr, scale: view.scale, tutHint: coach.ring(s.clock), fxTick: fxAcc % 6 === 0, mp: mp && mp.inGame && mp.own ? { me: mp.pid, own: mp.own } : null };
    drawScene(ctx, R);
  }
  function ambient() {
    if (ui !== "play") {
      sound.ambient(0, 0.02);
      return;
    }
    const flow = s.flow.reduce((a, b) => a + b, 0);
    const hiss = Math.min(1, flow / 12 + s.leaks.length * 0.35 + (s.venting ? 0.5 : 0));
    sound.ambient(hiss * 0.8, s.P / 100);
    sound.setIntensity(Math.min(1, Math.max(0, (s.P - 40) / 50) + (s.leaks.length ? 0.2 : 0)));
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dtReal = Math.min(0.1, (now - last) / 1e3 || 0);
    last = now;
    const playing = ui === "play", mpg = !!(mp && mp.inGame);
    if (playing && !(mpg && mp.paused))
      playTime += dtReal;
    if (mpg) {
      s.clock += dtReal;
      acc = 0;
    } else if (playing) {
      acc += dtReal * dbg.speed;
      let n = 0;
      while (acc >= DT && n < 60 * dbg.speed + 5) {
        update(DT);
        acc -= DT;
        n++;
        if (ui !== "play") {
          acc = 0;
          break;
        }
      }
    } else
      acc = 0;
    if (s.phase === "ended" && ui === "play") {
      endTimer -= dtReal;
      if (endTimer <= 0 && endTimer > -50) {
        endTimer = -100;
        ui = "ending";
        renderEnding();
        show("ending");
      }
    }
    visUpdate(dtReal, playing);
    if (playing && s.fire > 8 && Math.random() < 0.2 + s.fire / 400) {
      fx.smoke(L.chimney.x, L.chimney.y - 28, 1, 0.22 + s.smog / 250 + (s.flags.brown ? 0.08 : 0));
    }
    ambient();
    render();
  }
  if (DEBUG) {
    window.__game = {
      get pill() {
        return !$("b-snd").hidden;
      },
      updatePill,
      get toast() {
        return toast;
      },
      get notes() {
        return notes;
      },
      get mp() {
        return mp && { code: mp.code, pid: mp.pid, inGame: mp.inGame, players: mp.players, roles: mp.roles, mine: mp.mine, state: mp.state, net: mp.net, votes: mp.votes };
      },
      pt(i, v) {
        const c = column(L, i), r = canvas.getBoundingClientRect();
        return { x: r.left + (c.cx + L.offX) * view.scale, y: r.top + (c.ty1 - v * (c.ty1 - c.ty0)) * view.scale };
      },
      shovelPt() {
        const q = L.shovel, r = canvas.getBoundingClientRect();
        return { x: r.left + (q.x + q.w / 2 + L.offX) * view.scale, y: r.top + (q.y + q.h / 2) * view.scale };
      },
      get s() {
        return s;
      },
      get ui() {
        return ui;
      },
      get L() {
        return L;
      },
      get view() {
        return view;
      },
      get run() {
        return run;
      },
      resize,
      pauseHit,
      setBot(skill, opts) {
        dbg.bot = skill;
        dbg.botOpts = opts || {};
      },
      setSpeed(v) {
        dbg.speed = v;
      },
      setUiState: (u) => {
        ui = u;
      },
      input,
      settings,
      meta,
      log,
      fx,
      sound,
      jump(night, flags) {
        s = createState(5, { skipTutorial: night > 0 });
        if (flags)
          Object.assign(s.flags, flags);
        s.coal = 30;
        lastPhase = null;
        lastNight = -1;
        log = [];
        fx.clear();
        snap = null;
        beginNight(s, night);
        ui = "play";
        trackPhase();
        show(null);
      }
    };
  }
  function init() {
    wire();
    applySettings();
    resize();
    updateTitle();
    show("title");
    mpInit();
    showChallengeBanner();
    fetchBoard("score").then((e) => {
      boardAvailable = e !== null;
      updateBoardBtn();
    });
    requestAnimationFrame((t) => {
      last = t;
      frame(t);
    });
    window.__gameReady = true;
    if (window.__bootReady)
      window.__bootReady();
  }
  init();
})();
