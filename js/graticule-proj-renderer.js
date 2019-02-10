/**
 * Graticule Renderer v0.0.1  2019-02-10
 *     https://github.com/tomosn/simple-raster-projection
 * Copyright (C) 2019 T.Seno
 * All rights reserved.
 * @license MIT License (https://raw.githubusercontent.com/tomosn/simple-raster-projection/master/LICENSE)
 */
"use strict";


/**
 * shader program
 * @param {WebGLRenderingContext} gl
 */
function ShaderProgram(gl) {
  this.gl_ = gl;
  this.program_ = null;
  //
  this.locAttrCoordX_ = null;
  this.locAttrCoordY_ = null;
  this.locAttrViewCoord_ = null;
  this.locUnifProjCenter_ = null;
  this.locUnifViewLengthPerPixel_ = null;
  this.locUnifGraticuleIntervalDeg_ = null;
}

ShaderProgram.DIMENSION = 2;

ShaderProgram.BUFFER_SIZE = 4 * 4 * 2;


/**
 * prepare render
 * @param {Array} projCenter [longitude, latitude] (degrees)
 * @param {Array} viewRect [x_left, y_bottom, x_right, y_top]
 * @param {Array} canvasSize [width, height]
 */
ShaderProgram.prototype.prepareRender = function(projCenter, viewRect, canvasSize) {
  this.gl_.viewport(0, 0, this.gl_.canvas.width, this.gl_.canvas.height);
  this.gl_.clear(this.gl_.COLOR_BUFFER_BIT);

  this.gl_.blendFunc(this.gl_.SRC_ALPHA, this.gl_.ONE_MINUS_SRC_ALPHA);

  this.gl_.enableVertexAttribArray(this.locAttrCoordX_);
  this.gl_.vertexAttribPointer(this.locAttrCoordX_, 1, this.gl_.FLOAT, this.gl_.FALSE, 4*4, 0);
  this.gl_.enableVertexAttribArray(this.locAttrCoordY_);
  this.gl_.vertexAttribPointer(this.locAttrCoordY_, 1, this.gl_.FLOAT, this.gl_.FALSE, 4*4, 4*1);
  this.gl_.enableVertexAttribArray(this.locAttrViewCoord_);
  this.gl_.vertexAttribPointer(this.locAttrViewCoord_, 2, this.gl_.FLOAT, this.gl_.FALSE, 4*4, 4*2);

  const data = new Float32Array([
    // Screen(x,y)  View(x,y)
    -1.0, +1.0,   viewRect[0], viewRect[3],
    -1.0, -1.0,   viewRect[0], viewRect[1],
    +1.0, +1.0,   viewRect[2], viewRect[3],
    +1.0, -1.0,   viewRect[2], viewRect[1]
  ]);
  this.gl_.bufferSubData(this.gl_.ARRAY_BUFFER, 0, data);

  const toDeg = Math.PI / 180.0;
  this.gl_.uniform2f(this.locUnifProjCenter_, toDeg * projCenter[0], toDeg * projCenter[1]);

  const sx = (viewRect[2] - viewRect[0]) / canvasSize[0];
  const sy = (viewRect[3] - viewRect[1]) / canvasSize[1];
  this.gl_.uniform2f(this.locUnifViewLengthPerPixel_, sx, sy);

  this.gl_.activeTexture(this.gl_.TEXTURE0);
};

/**
 * render graticule
 * @param {Float} intervalDeg [degrees]
 */
ShaderProgram.prototype.renderGraticule = function(intervalDeg) {
  this.gl_.uniform1f(this.locUnifGraticuleIntervalDeg_, intervalDeg);
  this.gl_.drawArrays(this.gl_.TRIANGLE_STRIP, 0, 4);
}

/**
 * initialize
 * @param {string} vertexShaderStr
 * @param {string} fragmentShaderStr
 * @return {bool}
 */
ShaderProgram.prototype.init = function(vertexShaderStr, fragmentShaderStr) {
  const vertexShader = this.loadShader_(this.gl_.VERTEX_SHADER, vertexShaderStr);
  const fragmentShader = this.loadShader_(this.gl_.FRAGMENT_SHADER, fragmentShaderStr);

  const prog = this.gl_.createProgram();
  this.gl_.attachShader(prog, vertexShader);
  this.gl_.attachShader(prog, fragmentShader);

  this.gl_.linkProgram(prog);

  const linked = this.gl_.getProgramParameter(prog, this.gl_.LINK_STATUS);
  if (!linked && !this.gl_.isContextLost()) {
    var info = this.gl_.getProgramInfoLog(prog);
    alert("Error linking program:\n" + info);
    this.gl_.deleteProgram(prog);
    return false;
  }
  this.program_ = prog;

  this.gl_.useProgram(this.program_);

  this.locAttrCoordX_ = this.gl_.getAttribLocation(this.program_, "aCoordX");
  this.locAttrCoordY_ = this.gl_.getAttribLocation(this.program_, "aCoordY");
  this.locAttrViewCoord_ = this.gl_.getAttribLocation(this.program_, "aViewCoord");

  this.locUnifProjCenter_ = this.gl_.getUniformLocation(this.program_, "uProjCenter");

  this.locUnifViewLengthPerPixel_ = this.gl_.getUniformLocation(this.program_, "uViewLengthPerPixel");

  this.locUnifGraticuleIntervalDeg_ = this.gl_.getUniformLocation(this.program_, "uGraticuleIntervalDeg");

  const buff = this.gl_.createBuffer();
  this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, buff);
  this.gl_.bufferData(this.gl_.ARRAY_BUFFER, ShaderProgram.BUFFER_SIZE * ShaderProgram.DIMENSION * 4, this.gl_.DYNAMIC_DRAW);

  //this.gl_.clearColor(1.0, 1.0, 1.0, 1.0);
  this.gl_.clearColor(0.0, 0.0, 0.0, 1.0);

  this.gl_.frontFace(this.gl_.CCW);
  this.gl_.enable(this.gl_.CULL_FACE);
  this.gl_.cullFace(this.gl_.BACK);

  return true;
};

ShaderProgram.prototype.loadShader_ = function(type, shaderSrc) {
  const shader = this.gl_.createShader(type);
  this.gl_.shaderSource(shader, shaderSrc);
  this.gl_.compileShader(shader);
  if (!this.gl_.getShaderParameter(shader, this.gl_.COMPILE_STATUS) && !this.gl_.isContextLost()) {
    const info = this.gl_.getShaderInfoLog(shader);
    alert("Error compiling shader:\n" + info);
    this.gl_.deleteShader(shader);
    return null;
  }
  return shader;
};
