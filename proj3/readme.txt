[Project #3]
2018920031 유승리

> 사용한 라이브러리: WebGL2.0

> 개발 시 사용한 브라우저: Google Chrome

> 구현 성공한 것: 모든 요구사항을 구현하였습니다.
    - controlling chopper & camera w/ keyboard
    - terrain
        - vertex shader
            - only one attribute (texCoord)
            - compute x, y, z(height) w/ heightmap & texture coordinate
        - fragment shader
            - compute normal vector w/ central difference
    - lighting
        - one fixed light (made it dark for glowing bullets)
        - maximum nine glowing bullets
        - compute every lighting in the scene
    - shading
        - Blinn-Phong reflection model
        - Phong interpolation
        - applied to terrain & chopper(body+rotor)
    - glowing bullets  
        - set random initial velocity (x-axis direction) everytime pressing spacebar
        - compute its position w/ explicit Euler method
        - limit the number of maximum active bullets to 9
        - die if its z-value of position is smaller than 0 (z < 0)
    - modularization 
        - under './modules' directory

> 구현 실패한 것: 없습니다.

> 프로젝트 구조:
    ㄴ gl-matrix
    ㄴ modules
        ㄴ axes.js
        ㄴ chopper.js
        ㄴ light.js
        ㄴ material.js
        ㄴ shader.js
        ㄴ terrain.js
    ㄴ proj3.html
    ㄴ proj3.js
    ㄴ README.txt
    ㄴ yorkville.jpg