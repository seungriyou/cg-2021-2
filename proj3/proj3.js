"use strict";

import * as mat4 from "./gl-matrix/mat4.js"
import * as vec4 from "./gl-matrix/vec4.js"
import {toRadian} from "./gl-matrix/common.js"


function main()
{
    let canvas = document.getElementById('webgl');
    let gl = canvas.getContext('webgl2');
    
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.1,0.1,0.1,1);
    
    let V = mat4.create();
    let azimuth = 45;
    let elevation = 30;
    
    
    let fov = 50;
    let P = mat4.create();
    
    let axes = new Axes(gl);
    
    document.getElementsByTagName("BODY")[0].onkeydown = function(ev) {
        switch(ev.key)
        {
            case 'ArrowUp':
                if(ev.getModifierState("Shift"))	elevation += 5;
                break;
            case 'ArrowDown':
                if(ev.getModifierState("Shift"))	elevation += -5;
                break;
            case 'ArrowLeft':
                if(ev.getModifierState("Shift"))	azimuth += 5;
                break;
            case 'ArrowRight':
                if(ev.getModifierState("Shift"))	azimuth += -5;
                break;
            case 'a':
            case 'A':
                break;
            case 'z':
            case 'Z':
                break;
            case ' ':
                break;
            case '=':
            case '+':
                fov = Math.max(fov-5, 5);
                break;
            case '-':
            case '_':
                fov = Math.min(fov+5, 120);
                break;
        }
    
        let keystroke = "";
        if(ev.getModifierState("Shift"))	keystroke += "Shift + ";
        if(ev.key == ' ')   keystroke += 'SpaceBar';
        else                keystroke += ev.key;
        document.getElementById("output").innerHTML = keystroke;
    };


    let tick = function()
    {
        
        mat4.perspective(P, toRadian(fov), 1, 1, 100); 
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        transform_view(V, azimuth, elevation);
        
        axes.render(gl, V, P);
        requestAnimationFrame(tick, canvas); // Request that the browser calls tick
    };
    tick();
}


function transform_view(V, azimuth, elevation)
{
    mat4.fromTranslation(V, [0, 0,-6] );
    mat4.rotate(V, V, toRadian(elevation), [1, 0, 0]);
    mat4.rotate(V, V, -toRadian(azimuth), [0, 1, 0]);
    mat4.rotate(V, V, -toRadian(90), [0, 1, 0]);
    mat4.rotate(V, V, -toRadian(90), [1, 0, 0]);
}
class Axes
{
    constructor(gl, length=2)
    {
        this.MVP = mat4.create();
        if(!Axes.h_prog)
            Axes.h_prog = init_shaders(gl, Axes.src_shader_vert, Axes.src_shader_frag);
        this.init_vbo(gl,length);
    }
    init_vbo(gl,l)
    {
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        const vertices = new Float32Array([
            0,0,0, 1,0,0,
            l,0,0, 1,0,0,
            0,0,0, 0,1,0,
            0,l,0, 0,1,0,
            0,0,0, 0,0,1,
            0,0,l, 0,0,1,
        ]);
        const vbo = gl.createBuffer();  
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const SZ = vertices.BYTES_PER_ELEMENT;

        gl.vertexAttribPointer(Axes.loc_aPosition, 3, gl.FLOAT, false, SZ*6, 0);
        gl.enableVertexAttribArray(Axes.loc_aPosition);

        gl.vertexAttribPointer(Axes.loc_aColor, 3, gl.FLOAT, false, SZ*6, SZ*3);
        gl.enableVertexAttribArray(Axes.loc_aColor);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    set_uniform_matrices(gl, h_prog, V, P)
    {
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, V);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);
    }
    render(gl, V, P)
    {
        gl.useProgram(Axes.h_prog);
        gl.bindVertexArray(this.vao);
        this.set_uniform_matrices(gl, Axes.h_prog, V, P);
        gl.drawArrays(gl.LINES, 0, 6);
        gl.bindVertexArray(null);
        gl.useProgram(null);
    }
}
Axes.loc_aPosition = 5;
Axes.loc_aColor = 9;

Axes.src_shader_vert = 
`#version 300 es
layout(location=${Axes.loc_aPosition}) in vec4 aPosition;
layout(location=${Axes.loc_aColor}) in vec4 aColor;
uniform mat4 MVP;
out vec4 vColor;
void main()
{
    gl_Position = MVP * aPosition;
    vColor = aColor;
}
`;
Axes.src_shader_frag = 
`#version 300 es
#ifdef GL_ES
precision mediump float;
#endif
in vec4 vColor;
out vec4 fColor;
void main()
{
    fColor = vColor;
}
`;

Axes.shader = null;

function init_shader(gl, type, src)
{
    let h_shader = gl.createShader(type);
    if(!h_shader) return null;

    gl.shaderSource(h_shader, src);

    gl.compileShader(h_shader);

    let status = gl.getShaderParameter(h_shader, gl.COMPILE_STATUS);
    if(!status)
    {
        let err = gl.getShaderInfoLog(h_shader);
        console.log(`Failed to compile shader (${err})`);
        gl.deleteShader(h_shader);
        return null;
    }
    return h_shader;
}


function init_shaders(gl, src_vert, src_frag)
{
    
    let h_vert = init_shader(gl, gl.VERTEX_SHADER, src_vert);
    let h_frag = init_shader(gl, gl.FRAGMENT_SHADER, src_frag);
    if (!h_vert || !h_frag) return null;

    let h_prog = gl.createProgram();
    if (!h_prog) return null;

    gl.attachShader(h_prog, h_vert);
    gl.attachShader(h_prog, h_frag);

    gl.linkProgram(h_prog);

    let status = gl.getProgramParameter(h_prog, gl.LINK_STATUS);
    if(!status)
    {
        let err = gl.getProgramInfoLog(h_prog);
        console.log(`Failed to link program (${err})`);
        gl.deleteProgram(h_prog);
        gl.deleteShader(h_vert);
        gl.deleteShader(h_frag);
        return null;
    }
    return h_prog;
}



main();