[Project #2]
2018920031 유승리

> 사용한 라이브러리: glMatrix (/lib/gl-matrix/...)

> 개발 시 사용한 브라우저: Google Chrome

> 구현 성공한 것: 모든 요구사항을 구현하였습니다.
    - cube (edge length = 2)
    - 2 tracks as circles (radius = 10)
        - equator (white)
        - meridian (yellow)
    - line of sight (distance = 10) (pink)
    - x, y, z axes
    - multiple viewport
        - left half: orthographic camera (w/ lookAt())
        - right half: perspective camera (w/o lookAt(), implemented in two ways (line 243-282))
    - GUI(slide bars for longitude & latitude)
        - controlled by arrow keys & mouse
        - control the meridian, line of sight, and perspective view
        
> 구현 실패한 것: 없습니다.