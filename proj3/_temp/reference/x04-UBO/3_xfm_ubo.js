import {Shader} from "../modules/class_shader.mjs"
import * as mat4 from "../lib/gl-matrix/mat4.js"
import {toRadian} from "../lib/gl-matrix/common.js"

"use strict";

function main() {
    const loc_aPosition = 3;
    const src_vert =
    `#version 300 es
    layout(location=${loc_aPosition}) in vec4 aPosition;
    uniform matrices
    {
        mat4 uMat[3];
    };
    void main() {
        gl_Position = uMat[0] * uMat[1] * uMat[2] * aPosition;
    }`;
    
    const src_frag =
    `#version 300 es
    precision mediump float;
    out vec4 fColor;
    void main() {
        fColor = vec4(1.0, 0.0, 0.0, 1.0);
    }`;

    const canvas = document.getElementById('webgl');
    
    const gl = canvas.getContext('webgl2');
    
    const prog = new Shader(gl, src_vert, src_frag);
    gl.useProgram(prog.h_prog);
    
    const {vao, n} = initVAO(gl, loc_aPosition);
    
    const matR = mat4.create();
    const matT = mat4.create();
    const matS = mat4.create();

    const ubo = initUBO(gl, prog, matR, matT, matS);
    
    gl.clearColor(0, 0, 0, 1);

    function tick() {
        render(gl, vao, n, ubo, matR, matT, matS);
        requestAnimationFrame(tick, canvas);
    };
    
    tick();
}

function render(gl, vao, n, ubo, matR, matT, matS)
{
    const ANGULAR_VELOCITY = 60.0;

    let now = Date.now();
    
    mat4.fromRotation(matR, toRadian( (now*0.001*ANGULAR_VELOCITY)%360), [0, 0, 1]);
    mat4.fromTranslation(matT, [0.2*(0.5**Math.sin(0.001*now) + 1), 0, 0]);
    const s = 0.5*Math.sin(0.001*now) + 1;
    mat4.fromScaling(matS, [s,s,s]);
    
    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, matR);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 4*16, matT);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 4*16*2, matS);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, n);
    gl.bindVertexArray(null);
    
}

function initVAO(gl, loc_aPosition) {
    const vertices = new Float32Array([
        0, 0.1,   -0.1, -0.1,   0.1, -0.1
    ]);
    const n = 3; // The number of vertices
    
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(loc_aPosition, 2, gl.FLOAT, false, 0, 0);
    
    gl.enableVertexAttribArray(loc_aPosition);
    
    gl.bindVertexArray(null);
    
    return {vao, n};
}

function initUBO(gl, prog, matR, matT, matS) {

    const binding_matrices = 7;

//    console.log('MAX_UNIFORM_BUFFER_BINDINGS=' + gl.MAX_UNIFORM_BUFFER_BINDINGS);

    const idx_uniform_block = gl.getUniformBlockIndex(prog.h_prog, 'matrices');   // uniform block index
    gl.uniformBlockBinding(prog.h_prog, idx_uniform_block, binding_matrices);

    const ubo = gl.createBuffer();
    gl.bindBufferBase(gl.UNIFORM_BUFFER, binding_matrices, ubo);

    const FSIZE = 4;

    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
    gl.bufferData(gl.UNIFORM_BUFFER, FSIZE*16*3, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    return ubo;
}


main();
