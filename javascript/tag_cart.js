    // 声明 appRootInstance 在外部作用域，以便在 initializeTagAssistantLogic 内部和外部都可以访问
    let appRootInstance;

// 将所有核心逻辑封装到一个函数中
function initializeTagAssistantLogic() {
    console.log("initializeTagAssistantLogic started.");
    // ==================== 样式配置 ====================
    // Style is already in <head>, so no need to append it again here dynamically.
    // If it were not in the <head>, this part would be needed:
    /*
    const style = document.createElement('style');
    style.textContent = `...CSS content...`;
    document.head.appendChild(style);
    */


    // --- 全局状态和常量 ---
    let webpath = 'file';
    //const DEFAULT_CSV_URL = 'https://raw.githubusercontent.com/xhoxye/BooruTagCart/refs/heads/main/assets/danbooru_all.csv';
    const DEFAULT_CSV_URL = `${webpath}/tags/danbooru_all.csv`;
    const TAGS_PER_PAGE = 40; // 每页显示的标签数量
    
    // 全局UI文本配置
    const uiTexts = {
        searchInputPlaceholder: {
            zh: '搜索标签 (英文, 中文, 别名, 自定义分类...)',
            en: 'Search tags (English, Chinese, aliases, custom categories...)'
        },
        draggableHandleText: {
            zh: '标签助手 v 0.9 - 拖拽此处可移动',
            en: 'TagCart - Drag Here'
        },
        formatOptions: [
            { zh: '默认 (逗号+空格)', en: 'Default (comma + space)' },
            { zh: '下划线转空格', en: 'Underscore to space' },
            { zh: '权重 (tag:1.1)', en: 'Weighted (tag:1.1)' },
            { zh: '全格式化 (空格, 权重)', en: 'Full format (space, weighted)' }
        ],
        buttonTitles: {
            resetSearch: { zh: '清空搜索并重置类别', en: 'Clear search & reset categories' },
            copy: { zh: '复制', en: 'Copy' },
            nsfwFilter: { zh: 'NSFW 过滤', en: 'NSFW Filter' },
            clearAll: { zh: '清空已选', en: 'Clear All Selected' },
            floatBall: { zh: '点击显示标签助手', en: 'Click to show Tag Assistant' },
            toggleLanguage: { zh: '切换显示语言', en: 'Toggle Display Language' }
        },
        categoryFilterNames: {
            '-1': { zh: '全部', en: 'All' },
            '0': { zh: '通用', en: 'General' },
            '1': { zh: '作者', en: 'Artist' },
            '3': { zh: '版权', en: 'Copyright' },
            '4': { zh: '角色', en: 'Character' },
            '5': { zh: '元数据', en: 'Meta' },
            '6': { zh: 'Kontext', en: 'Kontext' }
        },
        customCategoryFilterNames: {
            '人物数量': { zh: '人物数量', en: 'Number of People' },
            '画质': { zh: '画质', en: 'Quality' },
            '反向': { zh: '反向', en: 'Negative' }
        },
        categoryMap: { // 用于生成标签标题的映射
            0: { zh: '通用', en: 'General' }, 1: { zh: '作者', en: 'Artist' }, 3: { zh: '版权', en: 'Copyright' }, 4: { zh: '角色', en: 'Character' }, 5: { zh: '元数据', en: 'Meta' },
            6: { zh: 'Kontext指令', en: 'Kontext Command' }, 7: { zh: '内置分类1', en: 'Built-in Category 1' }, 8: { zh: '内置分类2', en: 'Built-in Category 2' }
        },
        tagTitleDefaults: { // 标签标题中的默认文本
            en: {
                noTranslation: 'None',
                noAliases: 'None',
                noCustomCategory: 'None',
                unknownCategory: 'Unknown Category'
            },
            zh: {
                noTranslation: '无',
                noAliases: '无',
                noCustomCategory: '无',
                unknownCategory: '未知类别'
            }
        }
    };

    // 重新定义 CATEGORY_MAP 以使用 uiTexts 中的数据
    const CATEGORY_MAP = Object.keys(uiTexts.categoryMap).reduce((acc, key) => {
        acc[key] = uiTexts.categoryMap[key].zh; // 初始默认为中文
        return acc;
    }, {});
    
    let allTags = []; // 所有标签数据
    let filteredTags = []; // 经过筛选的标签
    let selectedTags = []; // 已选中的标签
    let currentPage = 1; // 当前页码

    let debounceTimer; // 防抖计时器
    let activeCategoryFilter = -1; // 当前激活的分类过滤器（-1表示全部）
    let isNsfwFilterActive = true; // NSFW 过滤是否激活（默认为激活）
    let activeCustomCategoryFilter = null; // 当前激活的自定义分类过滤器（例如 '人物数量'）
    let displayEnglishOnly = false; // 控制标签文本和UI元素显示中英文

    // --- DOM 元素引用 (将在 init 中动态创建并引用) ---
    // 这里不再是全局变量，而是在 init 内部声明并赋值，
    // 以确保它们引用的是动态创建的元素。
    // 但是，为了后续函数能够访问，它们需要作为外部变量声明
    // let appRoot; // 移到外部作用域
    let selectedTagsContainer;
    let tagDisplayContainer;
    let searchInput;
    let resetSearchBtn;
    let nsfwFilterBtn;
    let clearAllBtn;
    let copyBtn;
    let formatSelector;
    let weightInput;
    let paginationContainer;
    let tagFilterBtns;
    let customCategoryFilterBtns;
    let toggleLanguageBtn; 
    let floatBall;
    let draggableContainer;
    let draggableHandle;

    // --- 初始化函数 ---
    function init() {
        console.log("init() started.");
        // 动态创建 appRoot
        appRootInstance = document.createElement('div'); // 赋值给外部作用域的变量
        appRootInstance.id = 'app-root';
        appRootInstance.className = 'w-[1000px] flex flex-col p-4 space-y-3 overflow-hidden min-h-[700px]';

        // 创建可拖拽容器 (主UI界面)
        draggableContainer = document.createElement('div');
        draggableContainer.id = 'draggable-container';
        draggableContainer.className = 'flex flex-col space-y-3 p-4';
        draggableContainer.style.display = 'none'; // 默认隐藏
        // 附加到 appRoot
        
        draggableHandle = document.createElement('div');
        draggableHandle.id = 'draggable-handle';
        draggableHandle.className = 'flex-shrink-0';
        draggableContainer.appendChild(draggableHandle);

        selectedTagsContainer = document.createElement('div');
        selectedTagsContainer.id = 'selected-tags-container';
        selectedTagsContainer.className = 'p-2 rounded-lg h-[125px] flex flex-wrap gap-2 content-start overflow-y-auto';
        draggableContainer.appendChild(selectedTagsContainer);

        const controlBar = document.createElement('div');
        controlBar.className = 'flex-shrink-0 flex items-center gap-3';
        draggableContainer.appendChild(controlBar);

        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'relative flex-grow';
        controlBar.appendChild(searchWrapper);

        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'search-input';
        searchInput.className = 'input-control w-full p-2 pl-4 rounded-lg h-10';
        searchWrapper.appendChild(searchInput);

        resetSearchBtn = document.createElement('button');
        resetSearchBtn.id = 'reset-search-btn';
        resetSearchBtn.className = 'absolute right-2 top-1/2 -translate-y-1/2 p-1';
        resetSearchBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        searchWrapper.appendChild(resetSearchBtn);

        weightInput = document.createElement('input');
        weightInput.id = 'weight-input';
        weightInput.type = 'number';
        weightInput.value = '1.1';
        weightInput.step = '0.1';
        weightInput.className = 'input-control p-2 w-20 rounded-lg h-10 hidden';
        controlBar.appendChild(weightInput);

        formatSelector = document.createElement('select');
        formatSelector.id = 'format-selector';
        formatSelector.className = 'input-control p-2 rounded-lg h-10';
        formatSelector.innerHTML = `
            <option value="default"></option>
            <option value="spaces"></option>
            <option value="weighted"></option>
            <option value="full"></option>
        `;
        controlBar.appendChild(formatSelector);

        copyBtn = document.createElement('button');
        copyBtn.id = 'copy-btn';
        copyBtn.className = 'btn p-2 rounded-lg h-10 w-10 flex-shrink-0';
        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
        controlBar.appendChild(copyBtn);

        nsfwFilterBtn = document.createElement('button');
        nsfwFilterBtn.id = 'nsfw-filter-btn';
        nsfwFilterBtn.className = 'btn p-2 rounded-lg h-10 w-10 flex-shrink-0 active';
        nsfwFilterBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        controlBar.appendChild(nsfwFilterBtn);
        
        // 中英文切换按钮移动到 nsfwFilterBtn 右侧
        toggleLanguageBtn = document.createElement('button');
        toggleLanguageBtn.id = 'toggle-language-btn';
        toggleLanguageBtn.className = 'btn p-2 rounded-lg h-10 w-10 flex-shrink-0';
        toggleLanguageBtn.innerHTML = '<i class="fa-solid fa-language"></i>';
        controlBar.appendChild(toggleLanguageBtn); // 附加到 controlBar

        clearAllBtn = document.createElement('button');
        clearAllBtn.id = 'clear-all-btn';
        clearAllBtn.className = 'btn p-2 rounded-lg h-10 w-10';
        clearAllBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        controlBar.appendChild(clearAllBtn); // 附加到 controlBar


        const filterBtnsContainer = document.createElement('div');
        filterBtnsContainer.className = 'flex-shrink-0 flex gap-2';
        draggableContainer.appendChild(filterBtnsContainer);

        filterBtnsContainer.innerHTML = `
            <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md active" data-category="-1"></button>
            <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="0"></button>
            <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="1"></button>
            <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="3"></button>
            <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="4"></button>
            <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="5"></button>
            <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="6"></button>
            <button class="custom-category-filter-btn btn px-3 py-1 text-sm rounded-md" data-custom-category="人物数量"></button>
            <button class="custom-category-filter-btn btn px-3 py-1 text-sm rounded-md" data-custom-category="画质"></button>
            <button class="custom-category-filter-btn btn px-3 py-1 text-sm rounded-md" data-custom-category="反向"></button>
        `;
        tagFilterBtns = filterBtnsContainer.querySelectorAll('.tag-filter-btn');
        customCategoryFilterBtns = filterBtnsContainer.querySelectorAll('.custom-category-filter-btn');


        tagDisplayContainer = document.createElement('div');
        tagDisplayContainer.id = 'tag-display-container';
        tagDisplayContainer.className = 'flex-grow grid grid-cols-8 grid-rows-5 gap-2 overflow-hidden p-2';
        draggableContainer.appendChild(tagDisplayContainer);

        paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        paginationContainer.className = 'flex-shrink-0 flex justify-center items-center gap-4';
        draggableContainer.appendChild(paginationContainer);

        // 创建悬浮球
        floatBall = document.createElement('div');
        floatBall.id = 'float-ball';
        floatBall.innerHTML = '<i class="fa-solid fa-tags"></i>';
        floatBall.style.display = 'flex'; // 默认显示，CSS中的 display: none; 已移除
        // 附加到 appRoot
        
        // 将 draggableContainer 和 floatBall 添加到动态创建的 appRootInstance
        appRootInstance.appendChild(draggableContainer);
        appRootInstance.appendChild(floatBall);
        console.log("init() completed, appRootInstance and floatBall created.");
    }

    // --- 功能模块: 事件监听 ---
    function setupEventListeners() {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => applyFiltersAndRender(), 300);
        });

        resetSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            activeCategoryFilter = -1; 
            tagFilterBtns.forEach(b => {
                if (parseInt(b.dataset.category, 10) === -1) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
            activeCustomCategoryFilter = null; 
            customCategoryFilterBtns.forEach(b => b.classList.remove('active'));

            applyFiltersAndRender();
        });

        nsfwFilterBtn.addEventListener('click', () => {
            isNsfwFilterActive = !isNsfwFilterActive;
            nsfwFilterBtn.classList.toggle('active', isNsfwFilterActive);
            applyFiltersAndRender();
        });

        clearAllBtn.addEventListener('click', () => {
            selectedTags = []; 
            renderSelectedTags(); 
            renderTags(); 
        });

        copyBtn.addEventListener('click', copyTagsToClipboard); 
        formatSelector.addEventListener('change', () => {
            weightInput.classList.toggle('hidden', !['weighted', 'full'].includes(formatSelector.value));
        });

        weightInput.addEventListener('input', () => { 
            // 权重变化时不再更新文本框，因为文本框已移除
        });

        tagFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tagFilterBtns.forEach(b => b.classList.remove('active')); 
                btn.classList.add('active');
                activeCategoryFilter = parseInt(btn.dataset.category, 10);
                
                activeCustomCategoryFilter = null; 
                customCategoryFilterBtns.forEach(b => b.classList.remove('active'));

                applyFiltersAndRender();
            });
        });

        customCategoryFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const clickedCustomCategory = btn.dataset.customCategory;

                if (activeCustomCategoryFilter === clickedCustomCategory) {
                    activeCustomCategoryFilter = null; 
                } else {
                    activeCustomCategoryFilter = clickedCustomCategory; 
                }

                customCategoryFilterBtns.forEach(b => b.classList.remove('active')); 
                if (activeCustomCategoryFilter) {
                    btn.classList.add('active'); 
                }

                tagFilterBtns.forEach(b => {
                    if (parseInt(b.dataset.category, 10) === -1) {
                        b.classList.add('active'); 
                    } else {
                        b.classList.remove('active');
                    }
                });
                activeCategoryFilter = -1; 

                applyFiltersAndRender();
            });
        });

        // 语言切换按钮事件监听
        toggleLanguageBtn.addEventListener('click', () => {
            displayEnglishOnly = !displayEnglishOnly; 
            toggleLanguageBtn.classList.toggle('active', displayEnglishOnly); // 切换 active 状态
            updateUIText(displayEnglishOnly ? 'en' : 'zh'); // 更新所有UI文本
        });

        // 悬浮球点击事件
        if (floatBall) {
            floatBall.style.userSelect = 'none';
            floatBall.style.webkitUserSelect = 'none';
            floatBall.style.mozUserSelect = 'none';
            floatBall.style.msUserSelect = 'none';
        }
        // --- 鼠标拖拽事件 ---
        floatBall.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 只响应鼠标左键
            e.preventDefault(); // 阻止默认的文本选取行为和图片拖拽行为
            let isFloatBallDragging = false; // 用于判断是拖拽还是点击
            const startX = e.clientX;         // 记录点击时的初始X坐标
            const startY = e.clientY;         // 记录点击时的初始Y坐标
            const dragThreshold = 5;          // 拖拽阈值（像素），超过此距离才认定为拖拽
            // 计算鼠标点击位置相对于悬浮球左上角的偏移量
            const ballRect = floatBall.getBoundingClientRect();
            let offsetX = e.clientX - ballRect.left;
            let offsetY = e.clientY - ballRect.top;
            const onMouseMove = (moveEvent) => {
                // 如果还没有确认是拖拽，则检查是否超过阈值
                if (!isFloatBallDragging) {
                    if (Math.abs(moveEvent.clientX - startX) > dragThreshold ||
                        Math.abs(moveEvent.clientY - startY) > dragThreshold) {
                        isFloatBallDragging = true; // 确认开始拖拽
                        floatBall.classList.add('dragging'); // 可选：添加一个 CSS 类来改变样式，如光标
                    } else {
                        return; // 还没达到拖拽阈值，不进行移动
                    }
                }
                // 如果是拖拽状态，则计算并设置新位置
                if (isFloatBallDragging) {
                    let newX = moveEvent.clientX - offsetX;
                    let newY = moveEvent.clientY - offsetY;
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    const currentBallRect = floatBall.getBoundingClientRect(); // 实时获取，以防大小变化
                    // 边界限制
                    if (newX < 0) newX = 0;
                    if (newY < 0) newY = 0;
                    if (newX + currentBallRect.width > viewportWidth) newX = viewportWidth - currentBallRect.width;
                    if (newY + currentBallRect.height > viewportHeight) newY = viewportHeight - currentBallRect.height;
                    floatBall.style.left = `${newX}px`;
                    floatBall.style.top = `${newY}px`;
                    floatBall.style.right = 'auto'; // 确保不被 right 定位影响
                    floatBall.style.bottom = 'auto'; // 确保不被 bottom 定位影响
                }
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                // 只有当不是拖拽（即是点击）时才切换 draggableContainer 的显示
                if (!isFloatBallDragging) {
                    if (draggableContainer.style.display === 'none' || draggableContainer.style.display === '') {
                        draggableContainer.style.display = 'flex';
                        // 确保 positionDraggableContainer 存在且是函数
                        if (typeof positionDraggableContainer === 'function') {
                            positionDraggableContainer();
                        } else {
                            console.warn("positionDraggableContainer function not found.");
                        }
                    } else {
                        draggableContainer.style.display = 'none';
                    }
                }
                // 如果发生过拖拽，移除相应的 CSS 类
                if (isFloatBallDragging) {
                    floatBall.classList.remove('dragging');
                }
                isFloatBallDragging = false; // 重置拖拽状态
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        // --- 触摸拖拽事件 (新增) ---
        floatBall.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return; // 只处理单点触控
            e.preventDefault(); // 阻止默认的页面滚动和缩放
            let isFloatBallDragging = false;
            const startX = e.touches[0].clientX;
            const startY = e.touches[0].clientY;
            const dragThreshold = 5;
            const ballRect = floatBall.getBoundingClientRect();
            let offsetX = e.touches[0].clientX - ballRect.left;
            let offsetY = e.touches[0].clientY - ballRect.top;
            const onTouchMove = (moveEvent) => {
                if (moveEvent.touches.length !== 1) return;
                if (!isFloatBallDragging) {
                    if (Math.abs(moveEvent.touches[0].clientX - startX) > dragThreshold ||
                        Math.abs(moveEvent.touches[0].clientY - startY) > dragThreshold) {
                        isFloatBallDragging = true;
                        floatBall.classList.add('dragging');
                    } else {
                        return;
                    }
                }
                if (isFloatBallDragging) {
                    let newX = moveEvent.touches[0].clientX - offsetX;
                    let newY = moveEvent.touches[0].clientY - offsetY;
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    const currentBallRect = floatBall.getBoundingClientRect();
                    if (newX < 0) newX = 0;
                    if (newY < 0) newY = 0;
                    if (newX + currentBallRect.width > viewportWidth) newX = viewportWidth - currentBallRect.width;
                    if (newY + currentBallRect.height > viewportHeight) newY = viewportHeight - currentBallRect.height;
                    floatBall.style.left = `${newX}px`;
                    floatBall.style.top = `${newY}px`;
                    floatBall.style.right = 'auto';
                    floatBall.style.bottom = 'auto';
                }
            };
            const onTouchEnd = () => {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                document.removeEventListener('touchcancel', onTouchEnd); // 处理触摸被系统中断的情况
                if (!isFloatBallDragging) {
                    if (draggableContainer.style.display === 'none' || draggableContainer.style.display === '') {
                        draggableContainer.style.display = 'flex';
                        if (typeof positionDraggableContainer === 'function') {
                            positionDraggableContainer();
                        } else {
                            console.warn("positionDraggableContainer function not found.");
                        }
                    } else {
                        draggableContainer.style.display = 'none';
                    }
                }
                if (isFloatBallDragging) {
                    floatBall.classList.remove('dragging');
                }
                isFloatBallDragging = false;
            };
            document.addEventListener('touchmove', onTouchMove, { passive: false }); // passive: false 允许 preventDefault
            document.addEventListener('touchend', onTouchEnd);
            document.addEventListener('touchcancel', onTouchEnd); // 添加 touchcancel
        }, { passive: false }); // touchstart 也要设置 passive: false

        // 可拖拽容器拖拽事件
        let isDraggingContainer = false;
        let containerOffset = { x: 0, y: 0 };

        draggableHandle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; 
            isDraggingContainer = true;
            containerOffset = {
                x: e.clientX - draggableContainer.getBoundingClientRect().left,
                y: e.clientY - draggableContainer.getBoundingClientRect().top
            };
            draggableHandle.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingContainer) return;

            let newX = e.clientX - containerOffset.x;
            let newY = e.clientY - containerOffset.y;

            const containerRect = draggableContainer.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (newX < 0) newX = 0;
            if (newY < 0) newY = 0;
            if (newX + containerRect.width > viewportWidth) newX = viewportWidth - containerRect.width;
            if (newY + containerRect.height > viewportHeight) newY = viewportHeight - containerRect.height;
            
            draggableContainer.style.left = `${newX}px`;
            draggableContainer.style.top = `${newY}px`;
            draggableContainer.style.transform = 'none'; 
        });

        document.addEventListener('mouseup', () => {
            isDraggingContainer = false;
            draggableHandle.style.cursor = 'grab';
        });
    }

    // --- 功能模块: 加载与解析 CSV ---
    async function loadCSV(source) {
        console.log("loadCSV started.");
        allTags = []; 

        try {
            let csvData;
            if (typeof source === 'string') {
                const response = await fetch(source);
                if (!response.ok) {
                    throw new Error(`网络错误: ${response.status} ${response.statusText}`);
                }
                csvData = await response.text();
            } else {
                csvData = source;
            }

            Papa.parse(csvData, {
                worker: true, 
                header: false, 
                encoding: "UTF-8", 
                step: (row) => { 
                    const data = row.data;
                    if (data.length >= 3 && data[0]) {
                        allTags.push({
                            name: data[0].trim(), 
                            category: parseInt(data[1], 10), 
                            count: parseInt(data[2], 10), 
                            aliases: data[3] || '', 
                            translation: data[4] || '', 
                            customCategory: data[5] || '' 
                        });
                    }
                },
                complete: () => { 
                    console.log("loadCSV completed.");
                    // 加载完成后，计算并设置可拖拽容器和悬浮球的初始位置
                    positionDraggableContainer();
                    positionFloatBall();

                    // floatBall.style.display = 'flex'; // This line is now redundant as it's set in init()
 
                    applyFiltersAndRender(); 
                    updateUIText(displayEnglishOnly ? 'en' : 'zh'); // 确保加载完成后UI文本也更新
                },
                error: (err) => { 
                    console.error("加载或解析CSV时出错:", err);
                }
            });
        } catch (err) {
            console.error("加载或解析CSV时出错:", err);
        }
    }

    // 函数：定位可拖拽容器
    function positionDraggableContainer() {
        // 计算初始 left/top 位置：居中
        const containerWidth = draggableContainer.offsetWidth; 
        const containerHeight = draggableContainer.offsetHeight;
        const initialLeft = (window.innerWidth - containerWidth) / 3;
        const initialTop = (window.innerHeight - containerHeight) / 2;

        draggableContainer.style.top = `${initialTop}px`;
        draggableContainer.style.left = `${initialLeft}px`;
        draggableContainer.style.transform = 'none'; 
    }

    // 新增函数：定位悬浮球
    function positionFloatBall() {
        floatBall.style.top = `400px`; 
        floatBall.style.left = `20px`;
        floatBall.style.right = 'auto'; 
    }
    
    // --- 功能模块: 渲染与UI更新 ---
    function renderTags() {
        tagDisplayContainer.innerHTML = ''; 
        const startIndex = (currentPage - 1) * TAGS_PER_PAGE;
        const tagsToRender = filteredTags.slice(startIndex, startIndex + TAGS_PER_PAGE); 

        tagsToRender.forEach(tag => {
            const tagEl = document.createElement('div');
            // 根据 displayEnglishOnly 状态决定显示文本
            const displayText = displayEnglishOnly ? tag.name.replace(/_/g, ' ') : (tag.translation ? tag.translation : tag.name.replace(/_/g, ' '));
            
            tagEl.className = 'tag-item tag-interactive px-2 py-1 rounded-md cursor-pointer text-xs flex items-center justify-center';
            
            tagEl.dataset.category = tag.category; 
            tagEl.dataset.tagName = tag.name; 
            tagEl.title = generateTagTitle(tag); 

            const textSpan = document.createElement('span');
            textSpan.textContent = displayText;
            textSpan.style.overflow = 'hidden'; 
            textSpan.style.whiteSpace = 'nowrap'; 
            textSpan.style.textOverflow = 'ellipsis'; 
            textSpan.style.minWidth = '0'; 
            tagEl.appendChild(textSpan);

            if (selectedTags.some(st => st.name === tag.name)) {
                tagEl.classList.add('selected');
            }
            tagEl.addEventListener('click', () => toggleTagSelection(tag)); 
            tagDisplayContainer.appendChild(tagEl);
        });
    }

    function renderSelectedTags() {
        selectedTagsContainer.innerHTML = ''; 
        selectedTags.forEach(tag => {
            const tagEl = document.createElement('div');
            // 根据 displayEnglishOnly 状态决定显示文本
            const displayText = displayEnglishOnly ? tag.name.replace(/_/g, ' ') : (tag.translation ? tag.translation : tag.name.replace(/_/g, ' '));
            
            tagEl.className = 'tag-item tag-interactive px-2 py-1 rounded-md cursor-pointer text-xs flex items-center justify-center min-w-[50px] max-w-[250px]';
            
            tagEl.dataset.category = tag.category; 
            tagEl.title = generateTagTitle(tag); 

            const textSpan = document.createElement('span');
            textSpan.textContent = displayText;
            textSpan.style.overflow = 'hidden';
            textSpan.style.whiteSpace = 'nowrap';
            textSpan.style.textOverflow = 'ellipsis';
            textSpan.style.minWidth = '0';
            tagEl.appendChild(textSpan);
            
            tagEl.addEventListener('click', () => toggleTagSelection(tag)); 
            selectedTagsContainer.appendChild(tagEl);
        });
    }
    
    function renderPagination() {
        paginationContainer.innerHTML = ''; 
        const totalPages = Math.ceil(filteredTags.length / TAGS_PER_PAGE); 
        if (totalPages <= 1) return; 

        const createButton = (html, disabled, onClick) => {
            const btn = document.createElement('button');
            btn.innerHTML = html;
            btn.className = 'btn p-2 rounded-lg h-8 w-8 flex items-center justify-center';
            btn.disabled = disabled;
            if (!disabled) btn.onclick = onClick;
            return btn;
        };
        
        const prevBtn = createButton('<i class="fa-solid fa-chevron-left"></i>', currentPage === 1, () => {
            currentPage--;
            renderTags();
            renderPagination();
        });
        paginationContainer.appendChild(prevBtn);

        const pageInfo = document.createElement('span');
        pageInfo.textContent = `${currentPage} / ${totalPages}`;
        pageInfo.className = 'text-sm';
        paginationContainer.appendChild(pageInfo);

        const nextBtn = createButton('<i class="fa-solid fa-chevron-right"></i>', currentPage === totalPages, () => {
            currentPage++;
            renderTags();
            renderPagination();
        });
        paginationContainer.appendChild(nextBtn);
    }
    
    function applyFiltersAndRender() {
        const query = searchInput.value.toLowerCase().trim(); 
        let tempFilteredTags = allTags; 

        if (activeCategoryFilter !== -1) {
            tempFilteredTags = tempFilteredTags.filter(tag => tag.category === activeCategoryFilter);
        }

        if (activeCustomCategoryFilter) {
            tempFilteredTags = tempFilteredTags.filter(tag =>
                tag.customCategory.toLowerCase().includes(`内置分类-${activeCustomCategoryFilter}`.toLowerCase())
            );
        }

        if (isNsfwFilterActive) {
            tempFilteredTags = tempFilteredTags.filter(tag =>
                !tag.customCategory.toLowerCase().includes('内置分类-禁')
            );
        }

        if (query) {
            tempFilteredTags = tempFilteredTags.filter(tag =>
                tag.name.toLowerCase().includes(query) ||
                tag.aliases.toLowerCase().includes(query) ||
                tag.translation.toLowerCase().includes(query) ||
                tag.customCategory.toLowerCase().includes(query)
            );
        }

        filteredTags = tempFilteredTags; 
        currentPage = 1; 
        renderTags(); 
        renderPagination(); 
    }
    
    // --- 功能模块: 核心交互逻辑与辅助函数 ---
    function toggleTagSelection(tag) {
        const index = selectedTags.findIndex(st => st.name === tag.name);
        if (index > -1) {
            selectedTags.splice(index, 1); 
        } else {
            selectedTags.push(tag); 
        }
        renderSelectedTags(); 
        const displayedTagElement = tagDisplayContainer.querySelector(`[data-tag-name="${tag.name}"]`);
        if (displayedTagElement) {
            displayedTagElement.classList.toggle('selected', index === -1); 
        }
    }
    
    function generateTagTitle(tag) {
        const lang = displayEnglishOnly ? 'en' : 'zh';
        const categoryName = uiTexts.categoryMap[tag.category]?.[lang] || `${uiTexts.tagTitleDefaults[lang].unknownCategory} (${tag.category})`;
        
        return [
            `英文: ${tag.name}`,
            `中文: ${tag.translation || uiTexts.tagTitleDefaults[lang].noTranslation}`,
            `别名: ${tag.aliases || uiTexts.tagTitleDefaults[lang].noAliases}`,
            `${lang === 'zh' ? '类别' : 'Category'}: ${categoryName}`,
            `${lang === 'zh' ? '帖子数量' : 'Post Count'}: ${tag.count.toLocaleString()}`,
            `${lang === 'zh' ? '自定义分类' : 'Custom Category'}: ${tag.customCategory || uiTexts.tagTitleDefaults[lang].noCustomCategory}`
        ].join('\n');
    }
    
    function formatTags() {
        const format = formatSelector.value; 
        const weight = weightInput.value; 
        return selectedTags.map(tag => {
            let tagName = tag.name;
            if (format === 'spaces' || format === 'full') {
                tagName = tagName.replace(/_/g, ' '); 
            }
            if (format === 'weighted' || format === 'full') {
                tagName = `(${tagName}:${weight})`; 
            }
            return tagName;
        }).join(', '); 
    }

    function copyTagsToClipboard() {
        const formattedString = formatTags(); 
        if (!formattedString) {
            // 没有标签可供复制时，不进行任何操作或提示
            return; 
        }

        // --- Gradio Textbox 更新 ---
        // 1. 根据Gradio组件的elem_id "positive_prompt" 找到对应的textarea输入框
        const promptTextarea = document.querySelector('#positive_prompt textarea');

        // 2. 如果找到了输入框，则更新其值并触发事件
        if (promptTextarea) {
            // 将格式化后的标签字符串设置为输入框的值
            // 如果您希望追加而不是替换，可以修改为:
            promptTextarea.value += (promptTextarea.value ? ', ' : '') + formattedString; // 这是追加的操作，追加时检查是否已有内容
            // promptTextarea.value = formattedString; //这是替换的操作

            // 3. 触发'input'事件，以确保Gradio后端能够同步到值的变化
            promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            console.warn('未能找到ID为 "positive_prompt" 的Gradio文本框。');
        }

        // --- 剪贴板操作 (保持不变) ---
        navigator.clipboard.writeText(formattedString).then(() => {
            // 复制成功，不进行提示
        }).catch(err => {
            console.error('复制失败', err);
            // 复制失败，不进行提示
        });
    }

    // 新增函数：更新所有UI文本
    function updateUIText(lang) {
        // 搜索输入框
        searchInput.placeholder = uiTexts.searchInputPlaceholder[lang];
        // 拖拽条标题
        draggableHandle.textContent = uiTexts.draggableHandleText[lang];
        // 格式化下拉菜单
        Array.from(formatSelector.options).forEach((option, index) => {
            option.textContent = uiTexts.formatOptions[index][lang];
        });
        // 按钮悬停提示
        resetSearchBtn.title = uiTexts.buttonTitles.resetSearch[lang];
        copyBtn.title = uiTexts.buttonTitles.copy[lang];
        nsfwFilterBtn.title = uiTexts.buttonTitles.nsfwFilter[lang];
        clearAllBtn.title = uiTexts.buttonTitles.clearAll[lang];
        floatBall.title = uiTexts.buttonTitles.floatBall[lang];
        toggleLanguageBtn.title = uiTexts.buttonTitles.toggleLanguage[lang];

        // 分类过滤按钮文本
        tagFilterBtns.forEach(btn => {
            const category = btn.dataset.category;
            btn.textContent = uiTexts.categoryFilterNames[category]?.[lang] || '';
            // 同时更新 CATEGORY_MAP 以确保 generateTagTitle 使用正确的语言
            CATEGORY_MAP[category] = uiTexts.categoryMap[category]?.[lang] || '';
        });

        // 自定义分类过滤按钮文本
        customCategoryFilterBtns.forEach(btn => {
            const customCategory = btn.dataset.customCategory;
            btn.textContent = uiTexts.customCategoryFilterNames[customCategory]?.[lang] || '';
        });

        // 重新渲染标签以更新其标题和可能改变的显示文本
        renderTags();
        renderSelectedTags();
    }

    // --- 功能模块: 外观与主题 (自适应) ---
    function applyThemeFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const theme = urlParams.get('__theme');
        const html = document.documentElement;

        if (theme === 'dark') {
            html.setAttribute('data-theme', 'dark');
        } else {
            html.setAttribute('data-theme', 'light');
        }
    }

    // --- 启动应用 ---
    init(); // 调用 init 函数来动态创建所有 DOM 元素
    applyThemeFromUrl(); 
    setupEventListeners();

    if (isNsfwFilterActive) {
        nsfwFilterBtn.classList.add('active');
    }
    
    // 初始化 Sortable.js，用于拖拽已选标签
    new Sortable(selectedTagsContainer, {
        animation: 150, 
        ghostClass: 'ghost-class', 
        onEnd: (evt) => {
            const movedTag = selectedTags.splice(evt.oldIndex, 1)[0];
            selectedTags.splice(evt.newIndex, 0, movedTag);
            // 这里不再调用 updateFormattedTextBox，因为文本框已移除
        }
    });

    // 自动加载默认CSV文件
    loadCSV(DEFAULT_CSV_URL);
    
    // 初始化UI文本
    updateUIText(displayEnglishOnly ? 'en' : 'zh');
}
// ==================== 移动设备检测 ====================
function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    // 检测常见的移动设备标识符
    // 小写化 userAgent 进行不区分大小写的匹配
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
}

// ==================== Gradio 初始化和启动 ====================
// 使用 window.addEventListener('load') 作为统一的入口
window.addEventListener('load', () => {
    // 首先进行移动设备检测
    if (isMobileDevice()) {
        console.log("当前设备为移动设备，悬浮球组件不显示。");
        // 如果是移动设备，直接返回，不执行后续的初始化逻辑
        return;
    }
    // 如果不是移动设备，则继续执行初始化逻辑
    console.log("Window loaded. Attempting to initialize tag assistant.");
    initializeTagAssistantLogic(); // This calls init() and then loadCSV()

    const gradioContainer = typeof gradioApp === 'function' ? gradioApp() : null;
    // 直接使用在 initializeTagAssistantLogic 作用域中设置的 appRootInstance
    const appRootElement = appRootInstance; 

    if (gradioContainer && appRootElement) {
        console.log("Gradio environment detected. Appending appRoot to gradioApp().");
        gradioContainer.appendChild(appRootElement); // Attach the dynamically created root to Gradio container
    } else if (appRootElement) {
        console.log("Non-Gradio environment. Appending appRoot to document.body.");
        document.body.appendChild(appRootElement); // Fallback for standard HTML
    } else {
        // 只有在 appRootInstance 未被成功赋值时才会出现此错误
        console.error("Error: appRootElement (appRootInstance) not found after initializeTagAssistantLogic.");
    }
});