import { build } from "esbuild";
import { rmSync } from "fs";

// ลบโฟลเดอร์ dist เก่าก่อน build ใหม่
rmSync("dist", { recursive: true, force: true });

// // ปลั๊กอิน: เพิ่ม .js ให้กับ relative import ที่ไม่มีนามสกุล (สำหรับ runtime ESM ของ Node)
// const addJsExtensionPlugin = {
//   name: "add-js-extension",
//   setup(build) {
//     // จับเฉพาะ relative imports: './' หรือ '../'
//     const relativeImport = /^\.{1,2}\//;
//     const hasExt = /\.[a-zA-Z0-9]+$/;
//     build.onResolve({ filter: relativeImport }, (args) => {
//       // ถ้ามีสกุลไฟล์แล้ว ไม่ต้องแตะต้อง
//       if (hasExt.test(args.path)) return;
//       // ปล่อยให้เป็น external และเพิ่ม .js เพื่อให้ Node หาไฟล์ใน dist ได้
//       return { path: `${args.path}.js`, external: true };
//     });
//   },
// };


// เริ่ม build
await build({
  // Source map และลิขสิทธิ์
  /** Documentation: https://esbuild.github.io/api/#sourcemap */
  sourcemap: false, // boolean | 'linked' | 'inline' | 'external' | 'both'
  /** Documentation: https://esbuild.github.io/api/#legal-comments */
  legalComments: "linked", // 'none' | 'inline' | 'eof' | 'linked' | 'external'
  /** Documentation: https://esbuild.github.io/api/#source-root */
  sourceRoot: undefined, // string
  /** Documentation: https://esbuild.github.io/api/#sources-content */
  sourcesContent: false, // boolean

  // Target/Platform และรูปแบบเอาต์พุต
  /** Documentation: https://esbuild.github.io/api/#format */
  format: "cjs", // 'iife' | 'cjs' | 'esm'
  /** Documentation: https://esbuild.github.io/api/#global-name */
  globalName: undefined, // string (ชื่อ global เมื่อใช้ format: 'iife' เพื่อผูก API กับ window.MyLib)
  /** Documentation: https://esbuild.github.io/api/#target */
  target: ["es2020", "esnext", "node20", "node22", "node24"], // string | string[]
  /** Documentation: https://esbuild.github.io/api/#supported */
  supported: {}, // Record<string, boolean>
  /** Documentation: https://esbuild.github.io/api/#platform */
  platform: "node", // 'browser' | 'node' | 'neutral'
  /** Documentation: https://esbuild.github.io/api/#mangle-props */

  // Minify/Tree-shaking และการทำให้สั้น
  mangleProps: undefined, // RegExp
  /** Documentation: https://esbuild.github.io/api/#mangle-props */
  reserveProps: undefined, // RegExp
  /** Documentation: https://esbuild.github.io/api/#mangle-props */
  mangleQuoted: undefined, // boolean
  /** Documentation: https://esbuild.github.io/api/#mangle-props */
  mangleCache: undefined, // Record<string, string | false>
  /** Documentation: https://esbuild.github.io/api/#drop */
  drop: ["debugger"], // ('console' | 'debugger')[]
  /** Documentation: https://esbuild.github.io/api/#drop-labels */
  dropLabels: undefined, // string[]
  /** Documentation: https://esbuild.github.io/api/#minify */
  minify: false, // boolean (ถ้า true เท่ากับเปิด minifyWhitespace + minifyIdentifiers + minifySyntax)
  /** Documentation: https://esbuild.github.io/api/#minify */
  minifyWhitespace: false, // boolean
  /** Documentation: https://esbuild.github.io/api/#minify */
  minifyIdentifiers: false, // boolean
  /** Documentation: https://esbuild.github.io/api/#minify */
  minifySyntax: false, // boolean
  /** Documentation: https://esbuild.github.io/api/#line-limit */
  lineLimit: 0, // number จำกัดความยาวบรรทัดสูงสุดในเอาต์พุตที่ถูกย่อ (0/ไม่กำหนด = ไม่จำกัด)
  /** Documentation: https://esbuild.github.io/api/#charset */
  charset: "utf8", // 'ascii' | 'utf8'
  /** Documentation: https://esbuild.github.io/api/#tree-shaking */
  treeShaking: true, // boolean
  /** Documentation: https://esbuild.github.io/api/#ignore-annotations */
  ignoreAnnotations: false, // boolean

  // JSX/TSX
  /** Documentation: https://esbuild.github.io/api/#jsx */
  //   jsx?: 'transform' | 'preserve' | 'automatic'
  /** Documentation: https://esbuild.github.io/api/#jsx-factory */
  //   jsxFactory?: string
  /** Documentation: https://esbuild.github.io/api/#jsx-fragment */
  //   jsxFragment?: string
  /** Documentation: https://esbuild.github.io/api/#jsx-import-source */
  //   jsxImportSource?: string
  /** Documentation: https://esbuild.github.io/api/#jsx-development */
  //   jsxDev?: boolean
  /** Documentation: https://esbuild.github.io/api/#jsx-side-effects */
  //   jsxSideEffects?: boolean

  // Define/Optimize สำหรับโค้ด
  /** Documentation: https://esbuild.github.io/api/#define */
  define: undefined, // { [key: string]: string }
  /** Documentation: https://esbuild.github.io/api/#pure */
  pure: undefined, // string[]
  /** Documentation: https://esbuild.github.io/api/#keep-names */
  keepNames: false, // boolean

  // Log/Diagnostics และ TS
  /** Documentation: https://esbuild.github.io/api/#abs-paths */
  //   absPaths?: AbsPaths[]
  /** Documentation: https://esbuild.github.io/api/#color */
  //   color?: boolean
  /** Documentation: https://esbuild.github.io/api/#log-level */
  //   logLevel?: LogLevel
  /** Documentation: https://esbuild.github.io/api/#log-limit */
  //   logLimit?: number
  /** Documentation: https://esbuild.github.io/api/#log-override */
  //   logOverride?: Record<string, LogLevel>
  /** Documentation: https://esbuild.github.io/api/#tsconfig-raw */
  //   tsconfigRaw?: string | TsconfigRaw

  // Bundle/Output/Resolve
  /** Documentation: https://esbuild.github.io/api/#bundle */
  bundle: true, // boolean — ไม่รวมไฟล์ทั้งหมดเป็นไฟล์เดียว **ต้อง true เพื่อป้องกันข้อผิดพลาดเรื่อง module not found**
  /** Documentation: https://esbuild.github.io/api/#splitting */
  splitting: undefined, // boolean
  /** Documentation: https://esbuild.github.io/api/#preserve-symlinks */
  preserveSymlinks: undefined, // boolean
  /** Documentation: https://esbuild.github.io/api/#outfile */
  outfile: undefined, // string
  /** Documentation: https://esbuild.github.io/api/#metafile */
  metafile: false, //boolean
  /** Documentation: https://esbuild.github.io/api/#outdir */
  outdir: "dist", // string
  /** Documentation: https://esbuild.github.io/api/#outbase */
  outbase: "src", // string — ทำให้โครงสร้างโฟลเดอร์เหมือน src
  /** Documentation: https://esbuild.github.io/api/#external */
  // Externalize pino transport-related packages so their worker paths resolve correctly at runtime
  external: [], // string[]
  /** Documentation: https://esbuild.github.io/api/#packages */
  // Do not bundle node_modules; let Node resolve them from runtime
  packages: "external", // 'bundle' | 'external'
  /** Documentation: https://esbuild.github.io/api/#alias */
  alias: undefined, // Record<string, string>
  /** Documentation: https://esbuild.github.io/api/#loader */
  loader: undefined, // { [ext: string]: Loader }
  /** Documentation: https://esbuild.github.io/api/#resolve-extensions */
  resolveExtensions: [".ts", ".js", ".css", ".json"], // string[]
  /** Documentation: https://esbuild.github.io/api/#main-fields */
  mainFields: undefined, // string[]
  /** Documentation: https://esbuild.github.io/api/#conditions */
  conditions: undefined, // string[]
  /** Documentation: https://esbuild.github.io/api/#write */
  write: undefined, // boolean
  /** Documentation: https://esbuild.github.io/api/#allow-overwrite */
  allowOverwrite: undefined, // boolean
  /** Documentation: https://esbuild.github.io/api/#tsconfig */
  tsconfig: "tsconfig.json", // string
  /** Documentation: https://esbuild.github.io/api/#out-extension */
  outExtension: undefined, // { [ext: string]: string }
  /** Documentation: https://esbuild.github.io/api/#public-path */
  publicPath: undefined, // string
  /** Documentation: https://esbuild.github.io/api/#entry-names */
  entryNames: undefined, // string
  /** Documentation: https://esbuild.github.io/api/#chunk-names */
  chunkNames: undefined, // string
  /** Documentation: https://esbuild.github.io/api/#asset-names */
  assetNames: undefined, // string
  /** Documentation: https://esbuild.github.io/api/#inject */
  inject: undefined, // string[]
  /** Documentation: https://esbuild.github.io/api/#banner */
  banner: undefined, // { [type: string]: string }
  /** Documentation: https://esbuild.github.io/api/#footer */
  footer: undefined, // { [type: string]: string }
  /** Documentation: https://esbuild.github.io/api/#entry-points */
  entryPoints: ["src/server.ts"], // (string | { in: string, out: string })[] | Record<string, string>
  /** Documentation: https://esbuild.github.io/api/#stdin */
  stdin: undefined, // StdinOptions
  /** Documentation: https://esbuild.github.io/plugins/ */
  plugins: [], // Plugin[] (จะไม่มีผลเมื่อ bundle:false แต่เก็บไว้ได้)
  /** Documentation: https://esbuild.github.io/api/#working-directory */
  absWorkingDir: undefined, // string
  /** Documentation: https://esbuild.github.io/api/#node-paths */
  nodePaths: undefined, // string[]; // The "NODE_PATH" variable from Node.js
});
