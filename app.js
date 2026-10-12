document.addEventListener('DOMContentLoaded', function() {
  
    // 1. 스크롤 애니메이션 (Intersection Observer)
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.15
    };
  
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is_visible');
        } else {
          entry.target.classList.remove('is_visible');
        }
      });
    }, observerOptions);
  
    const animateElements = document.querySelectorAll('.animate_up, .animate_left, .animate_right');
    animateElements.forEach((el, index) => {
      // 순차적으로 약간의 딜레이를 주어 자연스럽게 등장하도록 함
      if(!el.style.transitionDelay) {
        el.style.transitionDelay = `${(index % 3) * 0.1}s`;
      }
      observer.observe(el);
    });
  
    // 2. Swiper 초기화 (5대 혜택 복구)
    // 썸네일(좌측 탭) 스와이퍼
    const thumbsSwiper = new Swiper('.swiper-nav-thumbs', {
      spaceBetween: 10,
      slidesPerView: 'auto',
      freeMode: true,
      watchSlidesProgress: true,
      direction: window.innerWidth > 968 ? 'vertical' : 'horizontal',
    });
  
    // 메인 컨텐츠 스와이퍼
    const mainSwiper = new Swiper('.swiper-main-content', {
      spaceBetween: 0,
      loop: true,
      autoplay: {
        delay: 30000,
        disableOnInteraction: false,
      },
      thumbs: {
        swiper: thumbsSwiper,
      },
      effect: 'fade',
      fadeEffect: {
        crossFade: true
      },
    });
  
    // 창 크기 조절 시 썸네일 방향 변경 (모바일 가로, PC 세로)
    window.addEventListener('resize', () => {
      const isMobile = window.innerWidth <= 968;
      const newDirection = isMobile ? 'horizontal' : 'vertical';
      if (thumbsSwiper.params.direction !== newDirection) {
        thumbsSwiper.changeDirection(newDirection, true);
      }
    });
    // 3. FAQ 아코디언 로직
    const faqItems = document.querySelectorAll('.accord_item');
    
    faqItems.forEach(item => {
      const btn = item.querySelector('.accord_btn');
      
      btn.addEventListener('click', () => {
        // 이미 열려있으면 닫기
        if (item.classList.contains('active')) {
          item.classList.remove('active');
        } else {
          // 다른 열려있는 항목 모두 닫기 (선택 사항: 아코디언 동작)
          faqItems.forEach(otherItem => otherItem.classList.remove('active'));
          // 클릭한 항목 열기
          item.classList.add('active');
        }
      });
    });
  
    // 4. Quick Menu (Top Button)
    const topBtn = document.querySelector('.top_btn');
    if (topBtn) {
      topBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }

  });

