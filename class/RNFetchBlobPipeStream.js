// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import {
  NativeModules,
  DeviceEventEmitter,
} from 'react-native'
import UUID from '../utils/uuid'

const RNFetchBlob = NativeModules.RNFetchBlob
const emitter = DeviceEventEmitter

export default class RNFetchBlobPipeStream {
  fromUri : string;
  toUri : string;
  bufferSize : ?number;
  closed : boolean;

  constructor(fromUri:string, toUri:string, bufferSize?:?number) {
    if(!fromUri || !toUri)
      throw Error('RNFetchBlob needs both `fromUri` and `toUri`!')
    this.bufferSize = bufferSize
    this.fromUri = fromUri
    this.toUri = toUri
    this.closed = false
    this._onProgress = () => {}
    this._onEnd = () => {}
    this._onError = () => {}
    this.streamId = 'RNFBRS'+ UUID()
    this.started = false

    // register for file stream event
    let subscription = emitter.addListener(this.streamId, (e) => {
      let {event, code, detail} = e
      if (event === 'progress') {
        if (this._onProgress) this._onProgress(detail)
        return
      }
      else if (this._onEnd && event === 'end') {
        this._onEnd(detail)
      }
      else {
        const err = new Error(detail)
        err.code = code || 'EUNSPECIFIED'
        if(this._onError)
          this._onError(err)
        else
          throw err
      }
      // when stream closed or error, remove event handler
      if (event === 'error' || event === 'end') {
        subscription.remove()
        this.closed = true
      }
    })

  }

  open() {
    if(!this.started) {
      RNFetchBlob.pipeStream(this.fromUri, this.toUri, this.bufferSize || 10240, this.streamId)
      this.started = true
    }
    else
      throw new Error('Stream closed')
  }

  onProgress(fn:() => void) {
    this._onProgress = fn
  }

  onError(fn) {
    this._onError = fn
  }

  onEnd (fn) {
    this._onEnd = fn
  }

  close(callback) {
    RNFetchBlob.closeStream(this.streamId, callback)
    this.closed = true
  }
}
