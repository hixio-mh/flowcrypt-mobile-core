
import { Str } from '../core/common';

type Attributes = { [attr: string]: string };
type Tag = { tagName: string; attribs: Attributes; text?: string; };
type Transformer = (tagName: string, attribs: Attributes) => Tag;

declare const dereq_html_sanitize: (dirty: string, opts?: {
  allowedTags?: string[],
  selfClosing?: string[],
  exclusiveFilter?: (frame: { tag: string, attribs: Attributes, text: string, tagPosition: number }) => boolean,
  transformTags?: { [tagName: string]: string | Transformer };
  allowedAttributes?: { [tag: string]: string[] },
  allowedSchemes?: string[],
}) => string;

const imgIconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4wcCFDYo46vlNAAAAq5JREFUWMPtmE1IVFEUx3/nzpu0QSkqbSwiFdxMCYGBSLRooZhvFAkFFy0qNy2SIvraBC5CCLetW7gVhMCBatPSdq100aYQtNFpMJP8nLmnxaQ2ozON48xo4t3dd+9778c553/OuVfo7zfs47Gv4f4LQGfbp7PdPjwLxYWPl1sqhxf/DRgJ3sEsuVhHiuvLJSUSDFEx+jq9i2e7fQguihTdl4oguMx2+9Jb0LNgNiwnTKFmBI15Cwomzhoa70TkHIqkhpaT9sU1O0LV6IeiWG82aIH72YsEwEN+LbcuvJOTyzARSxaINThmD9NMpOMaZmkI6wwRqR1MjbO9z4Ni76Eb/zqPd7m2OIDR1jLCbiALia4kTVesLQ6gmh488oJw86nMSTg+iLD6ZzaG/8vn3VWSbMaMW4eRtoQLvb3Ay7R7T7/9BPQUrxaPBwSPPNj8imkk6l7eP81CRXUzSlWyu+XZTtRZOMDvHX7E3N2mVBn0V2cGQZ0pDqCN9ab/muliOlizNUm7N7DOK2bcusICRoKXENOQcc8RHkFgU3xhtwmRm4nq9Ffc5h0w2lqG6JMsupIqvlVfBWC+pQSHvqS1mbanhQGMmQ5USrNLXqaP6eAJjr1fwep4Shg0Er1en1/A6WANxnTtyDdevZ0Ii68DW63s6Wc8IPkDPMLDHArwFebaL3JhQonr4JbmtLK2Pz+AYbcJ5WxOSSymz5lvKcEfGgMTSVmtZ66tIQ+lLjaFcQZyy7KqxH4kGgOvPGbVBvBIohe01sOKjeQOKFICgP/dJDC565Jw/M1P4GOa5tiXC+AtIu09iC3sAUqNYrQU3SmgIqBH0UIf8JR0cIdXH4eAh4AHDzBebpFMoi/0+RklXm7TA1YOL6KE9gRSUJRQ6h2hbHtHva8vMNcteSiSAwL4Gyfr0tZb1O99AAAAAElFTkSuQmCC';

/**
 * This file needs to be in platform/ folder because its implementation is platform-dependant
 *  - on browser, it uses DOMPurify
 *  - in Node (targetting mobile-core environment) it uses sanitize-html
 * It would be preferable to use DOMPurify on all platforms, but on Node it has a JSDOM dependency which is itself 20MB of code, not acceptable on mobile.
 */
export class Xss {

  private static ALLOWED_BASIC_TAGS = ['p', 'div', 'br', 'u', 'i', 'em', 'b', 'ol', 'ul', 'pre', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
    'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'address', 'blockquote', 'dl', 'fieldset', 'a', 'font', 'strong', 'strike', 'code'];

  private static ALLOWED_ATTRS = {
    a: ['href', 'name', 'target'],
    img: ['src'],
    font: ['size', 'color'],
    span: ['color'],
    div: ['color'],
    p: ['color'],
    em: ['style'], // tests rely on this, could potentially remove
    td: ['width', 'height'],
  };

  private static ALLOWED_SCHEMES = ['data', 'http', 'https', 'mailto'];

  /**
   * used whenever untrusted remote content (eg html email) is rendered, but we still want to preserve html
   */
  public static htmlSanitizeKeepBasicTags = (dirtyHtml: string): string => {
    const imgIconReplaceable = `IMG_ICON_${Str.sloppyRandom()}`;
    let sanitizeAgain = false;
    let cleanHtml = dereq_html_sanitize(dirtyHtml, {
      allowedTags: Xss.ALLOWED_BASIC_TAGS,
      allowedAttributes: Xss.ALLOWED_ATTRS,
      allowedSchemes: Xss.ALLOWED_SCHEMES,
      transformTags: {
        'img': (tagName, attribs) => {
          const srcBegin = (attribs.src || '').substring(0, 10);
          if (srcBegin.indexOf('data:') === 0) {
            return { tagName: 'img', attribs: { src: attribs.src } };
          } else if (srcBegin.indexOf('http://') === 0 || srcBegin.indexOf('https://') === 0) {
            sanitizeAgain = true;
            return { tagName: 'a', attribs: { href: String(attribs.src), target: "_blank" }, text: imgIconReplaceable };
          } else {
            return { tagName: 'img', attribs: {}, text: '[img]' } as Tag;
          }
        },
        '*': (tagName, attribs) => {
          // let the browser decide how big should elements be, based on their content
          if (attribs.width && attribs.width !== '1') {
            delete attribs.width;
          }
          if (attribs.height && attribs.height !== '1') {
            delete attribs.width;
          }
          // attribs.height|width === 1 are left here, so that they can be removed below
          return { tagName, attribs };
        },
      },
      exclusiveFilter: ({ tag, attribs }) => {
        if (attribs.width === '1' || attribs.height === '1') {
          return true; // remove tiny elements (often contain hidden content, tracking pixels, etc)
        }
        return false;
      }
    });
    if (sanitizeAgain) { // clean it one more time in case something bad slipped in
      cleanHtml = dereq_html_sanitize(cleanHtml, { allowedTags: Xss.ALLOWED_BASIC_TAGS, allowedAttributes: Xss.ALLOWED_ATTRS, allowedSchemes: Xss.ALLOWED_SCHEMES });
    }
    cleanHtml = cleanHtml.replace(new RegExp(imgIconReplaceable, 'g'), `<img src="${imgIconData}" />`);
    return cleanHtml;
  }

  public static htmlSanitizeAndStripAllTags = (dirtyHtml: string, outputNl: string): string => {
    let html = Xss.htmlSanitizeKeepBasicTags(dirtyHtml);
    const random = Str.sloppyRandom(5);
    const br = `CU_BR_${random}`;
    const blockStart = `CU_BS_${random}`;
    const blockEnd = `CU_BE_${random}`;
    html = html.replace(/<br[^>]*>/gi, br);
    html = html.replace(/\n/g, '');
    html = html.replace(/<\/(p|h1|h2|h3|h4|h5|h6|ol|ul|pre|address|blockquote|dl|div|fieldset|form|hr|table)[^>]*>/gi, blockEnd);
    html = html.replace(/<(p|h1|h2|h3|h4|h5|h6|ol|ul|pre|address|blockquote|dl|div|fieldset|form|hr|table)[^>]*>/gi, blockStart);
    html = html.replace(RegExp(`(${blockStart})+`, 'g'), blockStart).replace(RegExp(`(${blockEnd})+`, 'g'), blockEnd);
    html = html.split(br + blockEnd + blockStart).join(br).split(blockEnd + blockStart).join(br).split(br + blockEnd).join(br);
    let text = html.split(br).join('\n').split(blockStart).filter(v => !!v).join('\n').split(blockEnd).filter(v => !!v).join('\n');
    text = text.replace(/\n{2,}/g, '\n\n');
    // not all tags were removed above. Remove all remaining tags
    text = dereq_html_sanitize(text, { allowedTags: [] });
    text = text.trim();
    if (outputNl !== '\n') {
      text = text.replace(/\n/g, outputNl);
    }
    return text;
  }

  public static escape = (str: string) => {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\//g, '&#x2F;');
  }

  public static escapeTextAsRenderableHtml = (text: string) => {
    return Xss.escape(text)
      .replace(/\n/g, '<br>\n') // leave newline so that following replaces work
      .replace(/^ +/gm, spaces => spaces.replace(/ /g, '&nbsp;'))
      .replace(/^\t+/gm, tabs => tabs.replace(/\t/g, '&#9;'))
      .replace(/\n/g, ''); // strip newlines, already have <br>
  }

  public static htmlUnescape = (str: string) => {
    // the &nbsp; at the end is replaced with an actual NBSP character, not a space character. IDE won't show you the difference. Do not change.
    return str.replace(/&#x2F;/g, '/').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
  }

}
