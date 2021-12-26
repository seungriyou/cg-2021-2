"use strict";

import * as mat4 from "./gl-matrix/mat4.js"
import {toRadian} from "./gl-matrix/common.js"
import {Axes} from "./modules/axes.js"
import {Light} from "./modules/light.js"
import {Material} from "./modules/material.js"
import {Terrain} from "./modules/terrain.js"
import {Chopper} from "./modules/chopper.js"

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

    const g = 0.00000000005; // gravitational acceleration
    
    // ===== things to render =====
    let axes = new Axes(gl);
    let terrain = new Terrain(gl);
    let chopper = new Chopper(gl);

    // ===== lights =====
    // initialize w/ one fixed light
    let light_list = [
        new Light(
            // gl,
            // [2.2, 2.2, 2.2, 0.0],//[1.0, 1.5, 1.8, 0.0],   // position (directional light)
            // [0.1, 0.1, 0.1, 1.0],   // ambient
            // [0.1, 0.1, 0.1, 1.0],   // diffuse
            // [1.0, 1.0, 1.0, 1.0],   // specular
            // true,                   // enabled
            gl,
            [2.5, 2.5, 2.2, 1.0], // [1.8, 1.8, 1.5, 1.0],   // position (positional light)
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
                [-0.125, 0.0, 0.0, 1.0],    // position (start at chopper's front face) (point light)
                [0.03, 0.03, 0.03, 1.0],    // ambient
                [0.03, 0.03, 0.03, 1.0],    // diffuse
                [0.3, 0.3, 0.3, 1.0],       // specular
                false,                      // enabled
            )
        );
    }

    // ===== materials =====
    // terrain - copper
    const terrain_material = new Material(
        [0.19125,0.0735,0.0225], 
        [0.7038,0.27048,0.0828], 
        [0.256777,0.137622,0.086014], 
        0.1);
    // chopper - turquoise
    const chopper_material = new Material(
        [0.1,	0.18725,	0.1745], 
        [0.396,	0.74151,	0.69102], 
        [0.297254,	0.30829,	0.306678], 
        0.1);
    // chopper - silver
    // const chopper_material = new Material(
    //     [0.19225,0.19225,0.19225], 
    //     [0.50754,0.50754,0.50754], 
    //     [0.508273,0.508273,0.508273], 
    //     0.4);
    
    // ===== for chopper control =====
    const ANGLE_STEP = 6.0;
    const TRANS_STEP = 0.05;
    transform_chopper(M, 0.0, 1.0, 1.5); // initialize chopper's position

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
        if (ev.getModifierState("Shift"))	keystroke += "Shift + ";
        if (ev.key == ' ')   keystroke += 'SpaceBar';
        else                keystroke += ev.key;
        document.getElementById("output").innerHTML = keystroke;
    };

    // when press spacebar
    const shoot = function (M) {
        // find the first disabled light & turn that light on
        let disabled = light_list.find(function (light) { return light.enabled == false });
        let idx = light_list.indexOf(disabled);
        if (idx > -1) {
            light_list[idx].set_M(M);
            light_list[idx].set_velocity_x(-(Math.random() * 0.00025 + 0.0004));
            light_list[idx].turn_on(true);
        }
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
        for (let i in light_list) {
            light_list[i].render(gl, V, P);

            if (i == 0) continue;   // if fixed light, do not transform

            if (light_list[i].enabled) {
                // compute new position for bullets w/ velocity
                let delta_x = light_list[i].velocity_x * elapsed;
                let delta_z = light_list[i].velocity_z * elapsed;

                // translate bullets
                mat4.translate(light_list[i].M, light_list[i].M, [delta_x, 0, delta_z]);

                light_list[i].velocity_z = light_list[i].velocity_z - g * elapsed;
            }
        }

        // rotate the rotor of the chopper
        mat4.rotateZ(chopper.M_rotor, chopper.M_rotor, toRadian(( -(400 * elapsed) / 1000.0) % 360.0));

        // render things
        axes.render(gl, V, P);
        terrain.render(gl, V, P, light_list, terrain_material);
        chopper.render(gl, M, V, P, light_list, chopper_material);

        requestAnimationFrame(tick, canvas); // Request that the browser calls tick
    };
    tick();
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

main();