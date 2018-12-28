/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

const VERSION = '[BUILD_REPLACEABLE_VERSION]';

export class Catch {

  public static RUNTIME_VERSION = VERSION;

  public static handleErr = (e: any) => {
    // core errors that were not re-thrown are not so interesting as of 2018
  }

  public static report = (name: string, details?: any) => {
    // core reports are not so interesting as of 2018
  }

  public static version = () => {
    return Catch.RUNTIME_VERSION;
  }

}
