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
    
    let V = mat4.create();
    let azimuth = 45;
    let elevation = 30;
    
    let fov = 50;
    let P = mat4.create();

    let M = mat4.create();  // chopper

    let t_last = Date.now();

    const g = -0.000000001; // gravitational acceleration
    
    // ===== things to render =====
    let axes = new Axes(gl);
    let terrain = new Terrain(gl);
    let chopper = new Chopper(gl);

    // ===== lights =====
    // initialize w/ one fixed light
    let light_list = [
        new Light(
            gl,
            [1.8, 1.8, 1.8, 1.0],   // position
            [0.1, 0.1, 0.1, 1.0],   // ambient
            [0.2, 0.2, 0.2, 1.0],   // diffuse
            [1.0, 1.0, 1.0, 1.0],   // specular
            true,                   // enabled
        ),
    ];
    // add nine bullets
    for (let i = 0; i < 9; ++i) {
        light_list.push(
            new Light(
                gl, 
                [-0.125, 0.0, 0.0, 1.0],    // position (start at chopper's front face)
                [0.03, 0.03, 0.03, 1.0],    // ambient
                [0.03, 0.03, 0.03, 1.0],    // diffuse
                [0.3, 0.3, 0.3, 1.0],       // specular
                false,                      // enabled
                -(Math.random() * 0.0003 + 0.0003), // random x-axis velocity (-0.0006 ~ -0.0003)
            )
        );
    }

    // ===== materials =====
    // terrain - copper
    let terrain_mat = new Material([0.19125,0.0735,0.0225], [0.7038,0.27048,0.0828], [0.256777,0.137622,0.086014], 0.1);
    // chopper - silver
    let chopper_mat = new Material([0.19225,0.19225,0.19225], [0.50754,0.50754,0.50754], [0.508273,0.508273,0.508273], 0.4);
    
    // ===== for chopper control =====
    const ANGLE_STEP = 5.0;
    const TRANS_STEP = 0.05;
    transform_chopper(M, 0.0, 1.0, 1.0); // initialize chopper's position

    // keyboard control
    document.getElementsByTagName("BODY")[0].onkeydown = function(ev) {
        switch(ev.key)
        {
            case 'ArrowUp':
                if(ev.getModifierState("Shift"))	elevation += 5;
                else                                transform_chopper(M, 0, -TRANS_STEP, 0);
                break;
            case 'ArrowDown':
                if(ev.getModifierState("Shift"))	elevation += -5;
                else                                transform_chopper(M, 0, TRANS_STEP, 0);
                break;
            case 'ArrowLeft':
                if(ev.getModifierState("Shift"))	azimuth += 5;
                else                                transform_chopper(M, ANGLE_STEP, 0, 0);
                break;
            case 'ArrowRight':
                if(ev.getModifierState("Shift"))	azimuth += -5;
                else                                transform_chopper(M, -ANGLE_STEP, 0, 0);
                break;
            case 'a':
            case 'A':
                transform_chopper(M, 0, 0, TRANS_STEP);
                break;
            case 'z':
            case 'Z':
                transform_chopper(M, 0, 0, -TRANS_STEP);
                break;
            case ' ':
                shoot(M);
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


    const tick = function () {
        // compute timestep
        let now = Date.now();
        let elapsed = now - t_last;
        t_last = now;

        mat4.perspective(P, toRadian(fov), 1, 1, 100); 
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        transform_view(V, azimuth, elevation);
        
        // draw lights (fixed lights + bullets)
        for (let i in light_list)
        {
            light_list[i].render(gl, V, P);

            if (i == 0) continue;   // if fixed light, do not transform

            // compute new position for bullets w/ velocity
            let delta_x = light_list[i].velocity_x * elapsed;
            let delta_z = light_list[i].velocity_z * elapsed;

            // translate bullets
            mat4.translate(light_list[i].M, light_list[i].M, [delta_x, 0, delta_z]);

            light_list[i].velocity_z = light_list[i].velocity_z + g * elapsed;
        }

        // rotate the rotor of the chopper
        mat4.rotateZ(chopper.M_rotor, chopper.M_rotor, toRadian(( -(400 * elapsed) / 1000.0) % 360.0));

        // render things
        axes.render(gl, V, P);
        terrain.render(gl, V, P, light_list, terrain_mat);
        chopper.render(gl, M, V, P, light_list, chopper_mat);

        requestAnimationFrame(tick, canvas); // Request that the browser calls tick
    };
    tick();

    // when press spacebar
    const shoot = function (M) {
        // find the first disabled light & turn the light on
        let disabled = light_list.find(function (light) { return light.enabled == false });
        let idx = light_list.indexOf(disabled);
        if (idx > -1) {
            light_list[idx].set_M(M);
            light_list[idx].turn_on(true);
        }
    };
}

// for camera control
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

Axes.src_shader_vert = `#version 300 es
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
Axes.src_shader_frag = `#version 300 es
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

// ===== Light =====
class Light
{
    constructor(gl, position, ambient, diffuse, specular, enabled, velocity_x=0)
    {
		this.position = vec4.clone(position);
		this.ambient = vec3.clone(ambient);
		this.diffuse = vec3.clone(diffuse);
		this.specular = vec3.clone(specular);
        this.enabled = enabled;

        this.M = mat4.create();

		this.MVP = mat4.create();

        this.velocity_x = velocity_x;
        this.velocity_z = -0.00025;

        this.new_position = vec4.create();

		if(!Light.h_prog)
			Light.h_prog = init_shaders(gl, Light.src_shader_vert, Light.src_shader_frag);
	}
    turn_on(enabled)
    {
        this.enabled = enabled;
    }
    set_M(M)
    {
        // copy from the current chopper's M
        mat4.copy(this.M, M);
    }
    render(gl, V, P)
	{
		gl.useProgram(Light.h_prog);

        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, V);
		gl.uniformMatrix4fv(gl.getUniformLocation(Light.h_prog, "MVP"), false, this.MVP);

        vec4.transformMat4(this.new_position, this.position, this.M);
		gl.vertexAttrib4fv(Light.loc_aPosition, this.new_position);

        // if z < 0, turn the light off
        if (this.new_position[2] < 0)    this.turn_on(false);

        // draw only turned-on lights
		if (this.enabled) {
            gl.vertexAttrib3f(Light.loc_aColor, 1, 1, 1);
            gl.drawArrays(gl.POINTS, 0, 1);
        } 
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

// ===== Terrain ======
class Terrain
{
    constructor(gl, d=200)
    {
        this.MVP = mat4.create();
        this.MV = mat4.create();
        this.N = mat4.create();
        this.M = mat4.create();

        if(!Terrain.h_prog)
            Terrain.h_prog = init_shaders(gl, Terrain.src_shader_vert, Terrain.src_shader_frag);
        this.init_texture(gl);
        this.init_vbo(gl, d);
    }
    init_vbo(gl, d)
    {
        // ===== prepare for texCoords & indices =====
        const d_inv = 1/d;  // d = number of division

        // set arrays
        const texCoords = [];
        const indices = [];

        // generate texCoords
        for (let y = 0; y <= d; ++y) {
            for (let x = 0; x <= d; ++x) {
                texCoords.push(x * d_inv, y * d_inv);
            }
        }
        // generate indices
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
        this.n = indices.length;

        // ===== bind to vertex array =====
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

        gl.vertexAttribPointer(Terrain.loc_aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Terrain.loc_aTexCoord);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
    init_texture(gl)
    {
        // create a texture object
        let texture = gl.createTexture();
        if (!texture) {
            console.log('Failed to create the texture object');
            return false;
        }
        // flip the image's y axis 
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        // enable texture unit0
        gl.activeTexture(gl.TEXTURE0);
        // bind the texture object to the target
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // set the texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        // fill the texture with a 1x1 black pixel.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 255]));

        // create the image object
        let image = new Image();
        if (!image) {
            console.log('Failed to create the image object');
            return false;
        }
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        };
        image.src = './yorkville.jpg';
    }
    set_uniform_matrices(gl, h_prog, V, P)
    {
        // MV
        mat4.copy(this.MV, V);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MV"), false, this.MV);
        // MVP
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, V);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);
        // matNormal
        mat4.invert(this.N, this.MV);
        mat4.transpose(this.N, this.N);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "matNormal"), false, this.N);
    }
    set_uniform_lights(gl, h_prog, lights, V)
    {
        let v = vec4.create();
        for(let i = 0; i < Terrain.num_lights; ++i)
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
        }
    }
    set_uniform_material(gl, h_prog, mat)
    {
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.ambient"), mat.ambient);
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.diffuse"), mat.diffuse);
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.specular"), mat.specular);
        gl.uniform1f(gl.getUniformLocation(h_prog, "material.shininess"), mat.shininess * 128.0);
    }
    render(gl, V, P, lights, material)
    {
        gl.useProgram(Terrain.h_prog);
        gl.bindVertexArray(this.vao);
        this.set_uniform_matrices(gl, Terrain.h_prog, V, P);
        if (lights)     this.set_uniform_lights(gl, Terrain.h_prog, lights, V);
        if (material)   this.set_uniform_material(gl, Terrain.h_prog, material);
        gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
        gl.useProgram(null);
    }
}
Terrain.loc_aTexCoord = 7;
Terrain.num_lights = 10;

Terrain.src_shader_vert = `#version 300 es
// an attribute is an input in to a vertex shader.
// It will receive data from a buffer
layout(location=${Terrain.loc_aTexCoord}) in vec2 aTexCoord;

// A matrix to transform the positions by
uniform mat4 MVP;
uniform mat4 MV;
uniform mat4 matNormal;
// The texture.
uniform sampler2D uSampler;

// a varying to pass the texture coordinates to the fragment shader
out vec3 vNormal;
out vec4 vPosEye;

void main() {
    float l = 4.0;  // L_x = L_y = 4
    float s = 1.35;  // scale = 1.35

    // get the height from the heightmap image
    float heightmap_color = texture(uSampler, aTexCoord).r;
    float height = heightmap_color * s - 0.7;
    
    // set the new vertex 
    float x = float(aTexCoord.s * l - l / 2.0);
    float y = float(aTexCoord.t * l - l / 2.0);
    vec3 new_vertex = vec3(x, y, height);

    // compute normal vectors w/ central difference
    const float delta = 0.01;
    const float double_delta = 2.0 * delta;

    float s0 = texture(uSampler, aTexCoord + vec2(-delta, 0.0)).r;
    float s1 = texture(uSampler, aTexCoord + vec2(delta, 0.0)).r;
    float t0 = texture(uSampler, aTexCoord + vec2(0.0, -delta)).r;
    float t1 = texture(uSampler, aTexCoord + vec2(0.0, delta)).r;

    vec3 ds = vec3(l, 0.0, (s1 - s0) / double_delta);
    vec3 dt = vec3(0.0, l, (t1 - t0) / double_delta);
    vec3 new_normal = cross(ds, dt);

    // transform the location of the vertex for the graphics pipeline.
    gl_Position = MVP * vec4(new_vertex, 1.0);

    vPosEye = MV * vec4(new_vertex, 1.0);
    vNormal = normalize(mat3(matNormal) * new_normal);  // Blinn-Phong
}`;
Terrain.src_shader_frag =`#version 300 es
#ifdef GL_ES
precision mediump float;
#endif

// Passed in from the vertex shader.
in vec3 vNormal;
in vec4 vPosEye;
// we need to declare an output for the fragment shader.
out vec4 fColor;
struct Material
{
    vec3    ambient;
    vec3    diffuse;
    vec3    specular;
    float   shininess;
};
struct Light
{
    vec4    position;
    vec3    ambient;
    vec3    diffuse;
    vec3    specular;
    bool	enabled;
};
uniform Material material;
uniform Light light[${Terrain.num_lights}];

void main() {
    vec3 n = normalize(vNormal);
    vec3 l;
    vec3 v = normalize(-vPosEye.xyz);
    fColor = vec4(0.0);
    for (int i = 0; i < ${Terrain.num_lights}; ++i)
    {
        if(light[i].enabled)
        {
            // Blinn-Phong
            l = normalize((light[i].position - vPosEye).xyz);
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
            
            // Phong-Phong
            /*
            l = normalize((light[i].position - vPosEye).xyz);
            vec3	r = reflect(-l, n);
            float	l_dot_n = max(dot(l, n), 0.0);
            vec3	ambient = light[i].ambient * material.ambient;
            vec3	diffuse = light[i].diffuse * material.diffuse * l_dot_n;
            vec3	specular = vec3(0.0);
            if(l_dot_n > 0.0)
            {
                specular = light[i].specular * material.specular * pow(max(dot(r, v), 0.0), material.shininess);
            }
            fColor += vec4(ambient + diffuse + specular, 1);
            */
        }
    }
    fColor.w = 1.0;
}`;

Terrain.shader = null;

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
        // ===== body =====
        const vertices = new Float32Array([
            -0.125, -0.125, 0.125,  -0.125, 0.125, 0.125,  -0.125, -0.125, -0.125,  -0.125, 0.125, -0.125,// ABCD
            -0.125, -0.125, 0.125,  -0.125, 0.125, 0.125,  0.125, -0.125, 0.125,  0.125, 0.125, 0.125,// ABEF
            -0.125, -0.125, 0.125,  -0.125, -0.125, -0.125,  0.125, -0.125, 0.125,  0.125, -0.125, -0.125,// ACEG
            -0.125, 0.125, 0.125,  -0.125, 0.125, -0.125,  0.125, 0.125, 0.125,  0.125, 0.125, -0.125,// BDFH
            0.125, -0.125, 0.125,  0.125, 0.125, 0.125,  0.125, -0.125, -0.125,  0.125, 0.125, -0.125,// EFGH
            -0.125, -0.125, -0.125,  -0.125, 0.125, -0.125,  0.125, -0.125, -0.125,  0.125, 0.125, -0.125, // CDGH
            0.125, -0.07, 0.07,  0.125, 0.07, 0.07,  0.375, -0.07, 0.07,  0.375, 0.07, 0.07,// IJMN
            0.125, -0.07, 0.07,  0.125, -0.07, -0.07,  0.375, -0.07, 0.07,  0.375, -0.07, -0.07,// IKMO
            0.125, 0.07, 0.07,  0.125, 0.07, -0.07,  0.375, 0.07, 0.07,  0.375, 0.07, -0.07, // JLNP
            0.375, -0.07, 0.07,  0.375, 0.07, 0.07,  0.375, -0.07, -0.07,  0.375, 0.07, -0.07,// MNOP
            0.125, -0.07, -0.07,  0.125, 0.07, -0.07,  0.375, -0.07, -0.07,  0.375, 0.07, -0.07,// KLOP
        ]);
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

        const verticesBuffer = gl.createBuffer();
        if (!verticesBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(Chopper.loc_aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Chopper.loc_aPosition);

        const normalBuffer = gl.createBuffer();
        if (!normalBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(Chopper.loc_aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Chopper.loc_aNormal);        

        const indexBuffer = gl.createBuffer();
        if (!indexBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);


        // ===== rotor =====
        const rotor_vertices = new Float32Array([
            0.0, 0.0, 0.13,  -0.5, 0.08, 0.13,  -0.5, -0.08, 0.13,//ABC
            0.0, 0.0, 0.13,  -0.08, -0.5, 0.13,  0.08, -0.5, 0.13,//ADE
            0.0, 0.0, 0.13,  0.5, -0.08, 0.13,  0.5, 0.08, 0.13,//AFG
            0.0, 0.0, 0.13,  0.08, 0.5, 0.13,  -0.08, 0.5, 0.13,//AHI
        ]);
        const rotor_normals = new Float32Array([
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//ABC
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//ADE
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//AFG
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//AHI
        ]);

        this.rotor_vao = gl.createVertexArray();
        gl.bindVertexArray(this.rotor_vao);

        const rotor_verticesBuffer = gl.createBuffer();
        if (!rotor_verticesBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, rotor_verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, rotor_vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(Chopper.loc_aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Chopper.loc_aPosition);

        const rotor_normalBuffer = gl.createBuffer();
        if (!rotor_normalBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, rotor_normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, rotor_normals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(Chopper.loc_aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Chopper.loc_aNormal);   
        
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    set_uniform_matrices_body(gl, h_prog, M, V, P)
    {
        // MV
        mat4.copy(this.MV, V);
        mat4.copy(this.M, M);
        mat4.multiply(this.MV, this.MV, this.M); 
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MV"), false, this.MV);
        // MVP
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, this.MV);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);
        // matNormal
        mat4.copy(this.MVP, V);
        mat4.multiply(this.MVP, this.MVP, this.M);
        mat4.invert(this.N, this.MV);
        mat4.transpose(this.N, this.N);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "matNormal"), false, this.N);
    }
    set_uniform_matrices_rotor(gl, h_prog, M, V, P)
    {
        // MV
        mat4.copy(this.MV, V);
        mat4.copy(this.M, M);
        mat4.multiply(this.MV, this.MV, this.M);
        mat4.multiply(this.MV, this.MV, this.M_rotor);  // rotor's rotation
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MV"), false, this.MV);
        // MVP
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, this.MV);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);
        // matNormal
        mat4.copy(this.MVP, V); 
        mat4.multiply(this.MVP, this.MVP, this.M);
        mat4.invert(this.N, this.MV);
        mat4.transpose(this.N, this.N);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "matNormal"), false, this.N);
    }
    set_uniform_lights(gl, h_prog, lights, V)
    {
        let v = vec4.create();
        for(let i = 0; i < Chopper.num_lights; ++i)
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
    {
        gl.useProgram(Chopper.h_prog);

        // ===== rotor =====
        gl.bindVertexArray(this.rotor_vao);
        this.set_uniform_matrices_rotor(gl, Chopper.h_prog, M, V, P);
        if (lights)     this.set_uniform_lights(gl, Chopper.h_prog, lights, V);
        if (material)   this.set_uniform_material(gl, Chopper.h_prog, material);
        gl.drawArrays(gl.TRIANGLES, 0, 12);
        gl.bindVertexArray(null);

        // ===== body =====
        gl.bindVertexArray(this.body_vao);
        this.set_uniform_matrices_body(gl, Chopper.h_prog, M, V, P);
        if (lights)     this.set_uniform_lights(gl, Chopper.h_prog, lights, V);
        if (material)   this.set_uniform_material(gl, Chopper.h_prog, material);
        gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);

        gl.useProgram(null);
    }
}
Chopper.loc_aPosition = 0;
Chopper.loc_aNormal = 4;
Chopper.num_lights = 10;

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
        struct Material
        {
            vec3	ambient;
            vec3	diffuse;
            vec3	specular;
            float	shininess;
        };
        struct Light
        {
            vec4	position;
            vec3	ambient;
            vec3	diffuse;
            vec3	specular;
        	bool	enabled;
        };
        uniform Material	material;
        uniform Light		light[${Chopper.num_lights}];
        void main()
        {
            vec3	n = normalize(vNormal);
            vec3	l;
            vec3	v = normalize(-vPosEye.xyz);
            fColor = vec4(0.0);
            for(int i=0 ; i<${Chopper.num_lights} ; i++)
            {
                if(light[i].enabled)
                {   
                    l = normalize((light[i].position - vPosEye).xyz);
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

Chopper.shader = null;

// ===== Shaders =====
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