/** 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
class Tx {
  getId() {
    return this.id;
  }

  setId(id) {
    this.id = id;
  }
}

module.exports = Tx;