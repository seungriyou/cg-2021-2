"use strict";

import * as mat4 from "./gl-matrix/mat4.js"
import * as vec4 from "./gl-matrix/vec4.js"
import {toRadian} from "./gl-matrix/common.js"
import * as vec3 from "./gl-matrix/vec3.js"


function main()
{
    let canvas = document.getElementById('webgl');
    let gl = canvas.getContext('webgl2');
    
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.1,0.1,0.1,1);

    // 추가
    let M = mat4.create();
    
    let V = mat4.create();
    let azimuth = 45;
    let elevation = 30;
    
    
    let fov = 50;
    let P = mat4.create();

    let t_last = Date.now();
    
    let axes = new Axes(gl);
    let chopper = new Chopper(gl);

    // 추가
    //let M = chopper.M;

    // ===== lights =====
    let light_lists = [
        // fixed light
        new Light(
            gl,
            [1.8, 1.8, 1.8, 1.0],   // position
            
            [1.0, 1.0, 1.0, 1.0],
            [1.0, 1.0, 1.0, 1.0], 
            [1.0, 1.0, 1.0, 1.0],
            /*/
            [0.1, 0.1, 0.1, 1.0],   // ambient
            [0.2, 0.2, 0.2, 1.0], //[0.2, 0.2, 0.2, 1.0], //[1.0, 1.0, 1.0, 1.0],   // diffuse
            [1.0, 1.0, 1.0, 1.0],  //[0.9, 0.9, 0.9, 1.0], // specular
            */
            true
        ),
        // bullets
    ];

    // ===== materials =====
    // terrain = copper
    let terrain_mat = new Material([0.19125,0.0735,0.0225], [0.7038,0.27048,0.0828], [0.256777,0.137622,0.086014], 0.1);
    //let terrain_mat = new Material([0.24725,0.1995,	0.0745], [0.75164,0.60648,0.22648], [0.628281,0.555802,0.366065], 0.4);
    let chopper_mat = new Material([0.19225,0.19225,0.19225], [0.50754,0.50754,0.50754], [0.508273,0.508273,0.508273], 0.1);
    //let chopper_mat = new Material([0.25,0.20725,0.20725], [1.0,0.829,0.829], [0.296648,0.296648,0.296648], 0.088);

    // chopper control
    const ANGLE_STEP = 3.0;
    const TRANS_STEP = 0.05;
    let chopper_rotation = 0.0; // rotateZ
    let chopper_forback = 1.0; // x-axis
    let chopper_updown = 1.0; // z-axis
    transform_chopper(M, chopper_rotation, chopper_forback, chopper_updown);
    
    document.getElementsByTagName("BODY")[0].onkeydown = function(ev) {
        switch(ev.key)
        {
            case 'ArrowUp':
                if(ev.getModifierState("Shift"))	elevation += 5;
                else    
                {
                    chopper_forback -= 0.1; 
                    transform_chopper(M, 0, -TRANS_STEP, 0);
                }
                break;
            case 'ArrowDown':
                if(ev.getModifierState("Shift"))	elevation += -5;
                else    
                {
                    chopper_forback += 0.1; 
                    transform_chopper(M, 0, TRANS_STEP, 0);
                }
                break;
            case 'ArrowLeft':
                if(ev.getModifierState("Shift"))	azimuth += 5;
                else    {
                    chopper_rotation = (chopper_rotation + ANGLE_STEP) % 360; 
                    transform_chopper(M, ANGLE_STEP, 0, 0);
                }
                break;
            case 'ArrowRight':
                if(ev.getModifierState("Shift"))	azimuth += -5;
                else    
                {
                    chopper_rotation = (chopper_rotation - ANGLE_STEP) % 360;  
                    transform_chopper(M, -ANGLE_STEP, 0, 0);
                }
                break;
            case 'a':
            case 'A':
                chopper_updown += 0.1; 
                transform_chopper(M, 0, 0, TRANS_STEP);
                break;
            case 'z':
            case 'Z':
                chopper_updown -= 0.1; 
                transform_chopper(M, 0, 0, -TRANS_STEP);
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

        //transform_chopper(M, chopper_rotation, chopper_forback, chopper_updown);
    };


    let tick = function()
    {
        let now = Date.now();
        let elapsed = now - t_last;
        t_last = now;
        
        mat4.perspective(P, toRadian(fov), 1, 1, 100); 
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        transform_view(V, azimuth, elevation);

        axes.render(gl, V, P);



        for (let i in light_lists)
        {
            light_lists[i].render(gl, V, P);
        }

        //console.log(M);
        //chopper.render(gl, M, V, P, light_lists, chopper_mat);
        //transform_chopper(V, chopper_rotation, chopper_forback, chopper_updown);
        
        //transform_chopper(M, chopper_rotation, chopper_forback, chopper_updown);
        //chopper.render(gl, V, P, light_lists, chopper_mat);
        mat4.rotateZ(chopper.M_rotor, chopper.M_rotor, toRadian(( -(400 * elapsed) / 1000.0) % 360.0));
        
        //mat4.translate(chopper.M_rotor, chopper.M_rotor, [-0.125,0,0]);
        
        //transform_chopper_rotor(chopper.M_rotor);
        chopper.render(gl, M, V, P, light_lists, chopper_mat);

        

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
// for chopper control
function transform_chopper(M, chopper_rotation, chopper_forback, chopper_updown)
{
    
    mat4.translate(M, M, [chopper_forback, 0, chopper_updown]);
    mat4.rotateZ(M, M, toRadian(chopper_rotation));
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

// ===== Chopper =====
class Chopper
{
    constructor(gl)
    {
        this.MVP = mat4.create();
        this.MV = mat4.create();
        this.N = mat4.create();
        this.M = mat4.create();
        this.M_rotor = mat4.create();

        if(!Chopper.h_prog)
        Chopper.h_prog = init_shaders(gl, Chopper.src_shader_vert, Chopper.src_shader_frag);
        this.init_vbo(gl);
    }
    init_vbo(gl)
    {
        const vertices = new Float32Array([
            -0.125, -0.125, 0.125,  -0.125, 0.125, 0.125,  -0.125, -0.125, -0.125,  -0.125, 0.125, -0.125,// ABCD
            -0.125, -0.125, 0.125,  -0.125, 0.125, 0.125,  0.125, -0.125, 0.125,  0.125, 0.125, 0.125,// ABEF
            -0.125, -0.125, 0.125,  -0.125, -0.125, -0.125,  0.125, -0.125, 0.125,  0.125, -0.125, -0.125,// ACEG
            -0.125, 0.125, 0.125,  -0.125, 0.125, -0.125,  0.125, 0.125, 0.125,  0.125, 0.125, -0.125,// BDFH
            0.125, -0.125, 0.125,  0.125, 0.125, 0.125,  0.125, -0.125, -0.125,  0.125, 0.125, -0.125,// EFGH
            -0.125, -0.125, -0.125,  -0.125, 0.125, -0.0, 0.0, -0.125, -0.125,  0.125, 0.125, -0.125, // CDGH
            0.125, -0.07, 0.07,  0.125, 0.07, 0.07,  0.375, -0.07, 0.07,  0.375, 0.07, 0.07,// IJMN
            0.125, -0.07, 0.07,  0.125, -0.07, -0.07,  0.375, -0.07, 0.07,  0.375, -0.07, -0.07,// IKMO
            0.125, 0.07, 0.07,  0.125, 0.07, -0.07,  0.375, 0.07, 0.07,  0.375, 0.07, -0.07, // JLNP
            0.375, -0.07, 0.07,  0.375, 0.07, 0.07,  0.375, -0.07, -0.07,  0.375, 0.07, -0.07,// MNOP
            0.125, -0.07, -0.07,  0.125, 0.07, -0.07,  0.375, -0.07, -0.07,  0.375, 0.07, -0.07,// KLOP
            /*
            -0.25, -0.125, 0.125,  -0.25, 0.125, 0.125,  -0.25, -0.125, -0.125,  -0.25, 0.125, -0.125,// ABCD
            -0.25, -0.125, 0.125,  -0.25, 0.125, 0.125,  0.0, -0.125, 0.125,  0.0, 0.125, 0.125,// ABEF
            -0.25, -0.125, 0.125,  -0.25, -0.125, -0.125,  0.0, -0.125, 0.125,  0.0, -0.125, -0.125,// ACEG
            -0.25, 0.125, 0.125,  -0.25, 0.125, -0.125,  0.0, 0.125, 0.125,  0.0, 0.125, -0.125,// BDFH
            0.0, -0.125, 0.125,  0.0, 0.125, 0.125,  0.0, -0.125, -0.125,  0.0, 0.125, -0.125,// EFGH
            -0.25, -0.125, -0.125,  -0.25, 0.125, -0.125, 0.0, -0.125, -0.125,  0.0, 0.125, -0.125, // CDGH
            0.0, -0.07, 0.07,  0.0, 0.07, 0.07,  0.25, -0.07, 0.07,  0.25, 0.07, 0.07,// IJMN
            0.0, -0.07, 0.07,  0.0, -0.07, -0.07,  0.25, -0.07, 0.07,  0.25, -0.07, -0.07,// IKMO
            0.0, 0.07, 0.07,  0.0, 0.07, -0.07,  0.25, 0.07, 0.07,  0.25, 0.07, -0.07, // JLNP
            0.25, -0.07, 0.07,  0.25, 0.07, 0.07,  0.25, -0.07, -0.07,  0.25, 0.07, -0.07,// MNOP
            0.0, -0.07, -0.07,  0.0, 0.07, -0.07,  0.25, -0.07, -0.07,  0.25, 0.07, -0.07,// KLOP
            */
        ]);
        
        // Normal
        const normals = new Float32Array([
            
            -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,// ABCD
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,// ABEF
            0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,// ACEG
            0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,// BDFH
            1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,// EFGH
            0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,// CDGH
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,// IJMN
            0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,// IKMO
            0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,// JLNP
            1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,// MNOP
            0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,// KLOP
        ]);
        
        // Indices of the vertices
        const indices = new Uint16Array([
            
            0, 1, 2,  1, 3, 2,// ABCD
            5, 6, 7,  4, 6, 5,// ABEF
            8, 9, 10,  9, 11, 10,// ACEG
            13, 14, 15,  12, 14, 13,// BDFH
            17, 18, 19,  16, 18, 17,// EFGH
            20, 21, 22,  21, 23, 22,// CDGH
            25, 26, 27,  24, 26, 25,// IJMN
            28, 29, 30,  29, 31, 30,// IKMO
            33, 34, 35,  32, 34, 33,// JLNP
            37, 38, 39,  36, 38, 37,// MNOP
            40, 41, 42,  41, 43, 42,// KLOP
        ]);

        this.n = indices.length;
        

        this.body_vao = gl.createVertexArray();
        gl.bindVertexArray(this.body_vao);

        // Create a buffer object
        const verticesBuffer = gl.createBuffer();
        if (!verticesBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        // Write date into the buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.vertexAttribPointer(Chopper.loc_aPosition, 3, gl.FLOAT, false, 0, 0);
        // Enable the assignment of the buffer object to the attribute variable
        gl.enableVertexAttribArray(Chopper.loc_aPosition);


        // Create a buffer object
        const normalBuffer = gl.createBuffer();
        if (!normalBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        // Write date into the buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

        gl.vertexAttribPointer(Chopper.loc_aNormal, 3, gl.FLOAT, false, 0, 0);
        // Enable the assignment of the buffer object to the attribute variable
        gl.enableVertexAttribArray(Chopper.loc_aNormal);        

        //gl.bindVertexArray(null);
        // Unbind the buffer object
        //gl.bindBuffer(gl.ARRAY_BUFFER, null);


        
        // Create a buffer object
        const indexBuffer = gl.createBuffer();
        if (!indexBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        
        // Write date into the buffer object
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // ===============

       // rotor - vertices
        const rotor_vertices = new Float32Array([
            
            0.0, 0.0, 0.13,  -0.5, 0.1, 0.13,  -0.5, -0.1, 0.13,//ABC
            0.0, 0.0, 0.13,  -0.1, -0.5, 0.13,  0.1, -0.5, 0.13,//ADE
            0.0, 0.0, 0.13,  0.5, -0.1, 0.13,  0.5, 0.1, 0.13,//AFG
            0.0, 0.0, 0.13,  0.1, 0.5, 0.13,  -0.1, 0.5, 0.13,//AHI
            /*
            -0.125, 0.0, 0.13,  -0.625, 0.1, 0.13,  -0.625, -0.1, 0.13,//ABC
            -0.125, 0.0, 0.13,  -0.225, -0.5, 0.13,  -0.025, -0.5, 0.13,//ADE
            -0.125, 0.0, 0.13,  0.375, -0.1, 0.13,  0.375, 0.1, 0.13,//AFG
            -0.125, 0.0, 0.13,  -0.025, 0.5, 0.13,  -0.225, 0.5, 0.13,//AHI
            */
        ]);
        // rotor - normal
        const rotor_normals = new Float32Array([
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//ABC
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//ADE
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//AFG
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//AHI
        ]);
        this.rotor_vao = gl.createVertexArray();
        gl.bindVertexArray(this.rotor_vao);

        // Create a buffer object
        const rotor_verticesBuffer = gl.createBuffer();
        if (!rotor_verticesBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        // Write date into the buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, rotor_verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, rotor_vertices, gl.STATIC_DRAW);

        gl.vertexAttribPointer(Chopper.loc_aPosition, 3, gl.FLOAT, false, 0, 0);
        // Enable the assignment of the buffer object to the attribute variable
        gl.enableVertexAttribArray(Chopper.loc_aPosition);


        // Create a buffer object
        const rotor_normalBuffer = gl.createBuffer();
        if (!rotor_normalBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        // Write date into the buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, rotor_normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, rotor_normals, gl.STATIC_DRAW);

        gl.vertexAttribPointer(Chopper.loc_aNormal, 3, gl.FLOAT, false, 0, 0);
        // Enable the assignment of the buffer object to the attribute variable
        gl.enableVertexAttribArray(Chopper.loc_aNormal);   
        
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    set_uniform_matrices(gl, h_prog, M, V, P)
    //set_uniform_matrices(gl, h_prog, V, P)
    {
        // mat4 MV
        mat4.copy(this.MV, V);
        mat4.copy(this.M, M);
        mat4.multiply(this.MV, this.MV, this.M); //-> 우리는 M을 안쓸 예정?
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MV"), false, this.MV);
        
        // mat4 MVP
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, this.MV);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);

        // mat4 matNormal
        mat4.copy(this.MVP, V); //
        mat4.multiply(this.MVP, this.MVP, this.M);//
        mat4.invert(this.N, this.MV);
        mat4.transpose(this.N, this.N);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "matNormal"), false, this.N);

    }
    set_uniform_matrices_rotor(gl, h_prog, M, V, P)
    //set_uniform_matrices(gl, h_prog, V, P)
    {
        // mat4 MV
        mat4.copy(this.MV, V);
        mat4.copy(this.M, M);
        //mat4.multiply(this.M, this.M_rotor, this.M);
        mat4.multiply(this.MV, this.MV, this.M); //-> 우리는 M을 안쓸 예정?
        //mat4.translate(this.M_rotor, this.M_rotor, [-0.125,0,0,]);
        mat4.multiply(this.MV, this.MV, this.M_rotor);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MV"), false, this.MV);
        
        // mat4 MVP
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, this.MV);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);

        // mat4 matNormal
        mat4.copy(this.MVP, V); //
        mat4.multiply(this.MVP, this.MVP, this.M);//
        mat4.invert(this.N, this.MV);
        mat4.transpose(this.N, this.N);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "matNormal"), false, this.N);

    }
    set_uniform_lights(gl, h_prog, lights, V)
    {
        let v = vec4.create();
        for(let i = 0; i < Chopper.numLights; ++i)
        {
            let light = lights[i];
            mat4.copy(this.MV, V);
            mat4.multiply(this.MV, this.MV, light.M);
            vec4.transformMat4(v, light.position, this.MV);

            gl.uniform4fv(gl.getUniformLocation(h_prog, `light[${i}].position`), v);
            gl.uniform3fv(gl.getUniformLocation(h_prog, `light[${i}].ambient`), light.ambient);
            gl.uniform3fv(gl.getUniformLocation(h_prog, `light[${i}].diffuse`), light.diffuse);
            gl.uniform3fv(gl.getUniformLocation(h_prog, `light[${i}].specular`), light.specular);
            gl.uniform1i(gl.getUniformLocation(h_prog, `light[${i}].enabled`), light.enabled);

            //vec4.transformMat4(v, light.direction, this.MV);

            //gl.uniform4fv(gl.getUniformLocation(h_prog, `light[${i}].direction`), v);
            //gl.uniform1f(gl.getUniformLocation(h_prog, `light[${i}].cutoff_angle`), Math.cos(light.cutoff_angle*Math.PI/180.0));
        }
    }
    set_uniform_material(gl, h_prog, mat)
    {
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.ambient"), mat.ambient);
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.diffuse"), mat.diffuse);
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.specular"), mat.specular);
        gl.uniform1f(gl.getUniformLocation(h_prog, "material.shininess"), mat.shininess * 128.0);

    }
    render(gl, M, V, P, lights, material)
    //render(gl, V, P, lights, material)
    {
        gl.useProgram(Chopper.h_prog);
        


        // ===== rotor =====
        gl.bindVertexArray(this.rotor_vao);
        
        this.set_uniform_matrices_rotor(gl, Chopper.h_prog, M, V, P);
        //this.set_uniform_matrices(gl, Chopper.h_prog, V, P);
        if (lights)     this.set_uniform_lights(gl, Chopper.h_prog, lights, V);
        if (material)   this.set_uniform_material(gl, Chopper.h_prog, material);
        gl.drawArrays(gl.TRIANGLES, 0, 12);
        gl.bindVertexArray(null);
        

        // ===== body =====
        gl.bindVertexArray(this.body_vao);
        //mat4.multiply(this.M, this.M, this.M_rotor);
        this.set_uniform_matrices(gl, Chopper.h_prog, M, V, P);
        //this.set_uniform_matrices(gl, Chopper.h_prog, V, P);
        if (lights)     this.set_uniform_lights(gl, Chopper.h_prog, lights, V);
        if (material)   this.set_uniform_material(gl, Chopper.h_prog, material);
        gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);

        gl.useProgram(null);
    }
}
Chopper.loc_aPosition = 0;
Chopper.loc_aNormal = 4;
Chopper.numLights = 1;

// Blinn - Phong
Chopper.src_shader_vert = `#version 300 es
layout(location=${Chopper.loc_aPosition}) in vec4 aPosition;
layout(location=${Chopper.loc_aNormal}) in vec3 aNormal;
uniform mat4	MVP;
uniform mat4	MV;
uniform mat4	matNormal;
out vec3	vNormal;
out vec4	vPosEye;
void main()
{
    vPosEye = MV*aPosition;
    vNormal = normalize(mat3(matNormal)*aNormal);
    gl_Position = MVP*aPosition;
}
`;

Chopper.src_shader_frag = `#version 300 es
precision mediump float;
        in vec4	vPosEye;
        in vec3	vNormal;
        out vec4 fColor;
        struct TMaterial
        {
        	vec3	ambient;
        	vec3	diffuse;
        	vec3	specular;
        	vec3	emission;
        	float	shininess;
        };
        struct TLight
        {
        	vec4	position;
        	vec3	ambient;
        	vec3	diffuse;
        	vec3	specular;
        	bool	enabled;
        };
        uniform TMaterial	material;
        uniform TLight		light[${Chopper.numLights}];
        void main()
        {
        	vec3	n = normalize(vNormal);
        	vec3	l;
        	vec3	v = normalize(-vPosEye.xyz);
        	fColor = vec4(0.0);
        	for(int i=0 ; i<${Chopper.numLights} ; i++)
        	{
        		if(light[i].enabled)
        		{
        			if(light[i].position.w == 1.0)
        				l = normalize((light[i].position - vPosEye).xyz);		// positional light
        			else
        				l = normalize((light[i].position).xyz);	// directional light
        			float	l_dot_n = max(dot(l, n), 0.0);
        			vec3	ambient = light[i].ambient * material.ambient;
        			vec3	diffuse = light[i].diffuse * material.diffuse * l_dot_n;
        			vec3	specular = vec3(0.0);
        			if(l_dot_n > 0.0)
        			{
        				vec3	h = normalize(l + v);
        				specular = light[i].specular * material.specular * pow(max(dot(h, n), 0.0), material.shininess);
        			}
        			fColor += vec4(ambient + diffuse + specular, 1);
        		}
        	}
        	fColor.w = 1.0;
        }
`;

/*
// Blinn - Phong
Chopper.src_shader_vert = `#version 300 es
layout(location=${Chopper.loc_aPosition}) in vec4 aPosition;
layout(location=${Chopper.loc_aNormal}) in vec4 aNormal;
uniform mat4 MVP;
uniform mat4 matNormal;
out vec4 vColor;
void main() {
    gl_Position = MVP * aPosition;
    // Shading calculation to make the arm look three-dimensional
    vec3 lightDirection = normalize(vec3(0.0, 0.5, 0.7)); // Light direction
    vec4 color = vec4(1.0, 0.4, 0.0, 1.0);  // Robot color
    vec3 normal = normalize((matNormal * aNormal).xyz);
    float nDotL = max(dot(normal, lightDirection), 0.0);
    vColor = vec4(color.rgb * nDotL + vec3(0.1), color.a);
}
`;
Chopper.src_shader_frag = `#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 fColor;
void main() {
    fColor = vColor;
}
`;
*/
Chopper.shader = null;


// ===== Light =====
class Light
{
    constructor(gl, position, ambient, diffuse, specular, enabled)//, cutoff_angle = 180, direction = [0,0,0])
	{
		this.position = vec4.clone(position);
		this.ambient = vec3.clone(ambient);
		this.diffuse = vec3.clone(diffuse);
		this.specular = vec3.clone(specular);
		this.enabled = enabled;
		this.M = mat4.create();
		this.MVP = mat4.create();
		//this.direction = vec4.clone([direction[0], direction[1], direction[2], 0.0]);
		//this.cutoff_angle = cutoff_angle;

		if(!Light.h_prog)
			Light.h_prog = init_shaders(gl, Light.src_shader_vert, Light.src_shader_frag);
	}
	set_type(positional)
	{
		if(positional)	this.position[3] = 1.0;
		else			this.position[3] = 0.0;
	}
	turn_on(enabled)
	{
		this.enabled = enabled;
	}
	render(gl, V, P)
	{
        let v = vec4.create();

		gl.useProgram(Light.h_prog);
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, V);
//		this.MVP.set(P); this.MVP.multiply(V);
		gl.uniformMatrix4fv(gl.getUniformLocation(Light.h_prog, "MVP"), false, this.MVP);
        vec4.transformMat4(v, this.position, this.M);
		gl.vertexAttrib4fv(Light.loc_aPosition, v);
//		gl.vertexAttrib4fv(Light.loc_aPosition, this.M.multiplyVector4(this.position).elements);
		if(this.enabled)	gl.vertexAttrib3f(Light.loc_aColor, 1, 1, 1);
		else				gl.vertexAttrib3f(Light.loc_aColor, .1, .1, .1);
		gl.drawArrays(gl.POINTS, 0, 1);
		gl.useProgram(null);
	}
}
Light.loc_aPosition = 3;
Light.loc_aColor = 8;

Light.src_shader_vert = `#version 300 es
layout(location=${Light.loc_aPosition}) in vec4 aPosition;
layout(location=${Light.loc_aColor}) in vec4 aColor;
uniform mat4 MVP;
out vec4 vColor;
void main()
{
    gl_Position = MVP * vec4(aPosition.xyz, 1);
    gl_PointSize = 6.0;
    vColor = aColor;
}
`;
Light.src_shader_frag = `#version 300 es
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

Light.shader = null;
Light.generate_uniform_names = function()
{

};

// ===== Material =====
class Material
{
    constructor(ambient, diffuse, specular, shininess)
	{
		this.ambient = vec3.clone(ambient);
		this.diffuse = vec3.clone(diffuse);
		this.specular = vec3.clone(specular);
		this.shininess = shininess;
	}
}


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
