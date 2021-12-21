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
    let terrain = new Terrain(gl);
    
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
        terrain.render(gl, V, P);

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

// ===== Axes =====
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

// ===== Terrain ======
class Terrain
{
    constructor(gl, d=150)
    {
        this.MVP = mat4.create();
        if(!Terrain.h_prog)
            Terrain.h_prog = init_shaders(gl, Terrain.src_shader_vert, Terrain.src_shader_frag);
        this.init_texture(gl);
        this.init_vbo(gl, d);
    }
    init_vbo(gl, d)
    {
        // ===== prepare for texCoords & indices =====
        // division (grid)
        //const d = 20;
        const d_inv = 1/d;
        // number of vertices
        //this.n = (d + 1) * (d + 1);
        this.n = d * d;

        // set arrays
        const texCoords = [];
        const indices = [];

        // texCoords
        for (let y = 0; y <= d; ++y) {
            for (let x = 0; x <= d; ++x) {
                texCoords.push(x*d_inv, y*d_inv);
            }
        }
        // indices
        const rowStride = d + 1;
        for (let y = 0; y < d; ++y) {
            const rowOff = y * rowStride;
            for (let x = 0; x < d; ++x) {
                indices.push(rowOff + x, rowOff + x + 1, rowOff + x + rowStride + 1);
            }
        }
        for (let x = 0; x < d; ++x) {
            for (let y = 0; y < d; ++y) {
                const rowOff = y * rowStride;
                indices.push(rowOff + x, rowOff + x + rowStride + 1, rowOff + x + rowStride);
            }
        }

        // ====
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // texCoord buffer
        const texCoordBuffer = gl.createBuffer();
        if (!texCoordBuffer) {
            console.log('Failed to create the texCoord buffer object');
            return -1;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        // index buffer
        const indexBuffer = gl.createBuffer();
        if (!indexBuffer) {
            console.log('Failed to create the index buffer object');
            return -1;
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        // attrib
        gl.vertexAttribPointer(Terrain.loc_aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Terrain.loc_aTexCoord);


        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);


    }
    init_texture(gl)
    {
        // Create a texture object
        let texture = gl.createTexture();
        if (!texture) {
            console.log('Failed to create the texture object');
            return false;
        }

        // get the storage location of uSampler
        //?????

        // Flip the image's y axis 
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        // Enable texture unit0
        gl.activeTexture(gl.TEXTURE0);
        // Bind the texture object to the target
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Set the texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Set the texture image
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
         // Fill the texture with a 1x1 black pixel.
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        //    new Uint8Array([0, 0, 0, 255]));

        // Create the image object
        let image = new Image();
        if (!image) {
            console.log('Failed to create the image object');
            return false;
        }
        // Register the event handler to be called on loading an image
        //image.onload = () => this.load_texture(gl, texture, loc_uSampler, image); //console.log("image loaded!") };
        image.addEventListener('load', function() {
            console.log('image loaded!');
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        })

        // Tell the browser to load an image
        image.src = './yorkville.jpg';

        //return true;
    }
    set_uniform_matrices(gl, h_prog, V, P)
    {
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, V);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);
    }
    render(gl, V, P)
    {
        gl.useProgram(Terrain.h_prog);
        gl.bindVertexArray(this.vao);
        this.set_uniform_matrices(gl, Terrain.h_prog, V, P);
        // get the storage location of uSampler
        //let loc_uSampler = gl.getUniformLocation(Terrain.h_prog, 'uSampler');
        //if (!loc_uSampler) {
        //    console.log('Failed to get the storage location of uSampler');
        //    return false;
        //}
        // Set the texture unit 0 to the sampler
        //gl.uniform1i(loc_uSampler, 0);
        gl.drawElements(gl.TRIANGLES, 6 * this.n, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
        gl.useProgram(null);
    }
}
Terrain.loc_aTexCoord = 7;

Terrain.src_shader_vert =
`#version 300 es

// an attribute is an input in to a vertex shader.
// It will receive data from a buffer
layout(location=${Terrain.loc_aTexCoord}) in vec2 aTexCoord;

// A matrix to transform the positions by
uniform mat4 MVP;
// The texture.
uniform sampler2D uSampler;

// a varying to pass the texture coordinates to the fragment shader
//out vec4 vColor;
out vec2 vTexCoord;

void main() {
    // gl_Position 값은 x, y, z 각각 계산해주어야 함
    // L_x = L_y = 4라고 설정
    // S = 2라고 설정

    // get the height from the heightmap image
    vec4 heightmap_color = vec4(texture(uSampler, aTexCoord));
    float height = heightmap_color[0] * 1.5 - 0.7;
    
    // set the new vertex 
    float x = float(aTexCoord.s * 4.0 - 2.0);
    float y = float(aTexCoord.t * 4.0 - 2.0);
    vec3 new_vertex = vec3(x, y, height);

    // Pass the texcoord to the fragment shader.
    vTexCoord = aTexCoord;

    // transform the location of the vertex for the graphics pipeline.
    gl_Position = MVP * vec4(new_vertex, 1.0);
}`;
Terrain.src_shader_frag =
`#version 300 es
#ifdef GL_ES
precision mediump float;
#endif

// Passed in from the vertex shader.
in vec2 vTexCoord;

// The texture.
uniform sampler2D uSampler;

// we need to declare an output for the fragment shader.
out vec4 fColor;

void main() {
    fColor = texture(uSampler, vTexCoord);
}`;

Terrain.shader = null;

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
