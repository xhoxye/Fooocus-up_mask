// tag_cart.js

// 声明 appRootInstance 在外部作用域，以便在 initializeTagAssistantLogic 内部和外部都可以访问
let appRootInstance;

// 将所有核心逻辑封装到一个函数中
function initializeTagAssistantLogic() {
    console.log("initializeTagAssistantLogic started.");
    // ==================== 样式配置 ====================
    // Style is already in <head>

    // --- 全局状态和常量 ---
    let webpath = 'file'; // gradio专用 不要删除
    const DEFAULT_CSV_URL = `${webpath}/tags/danbooru_all.csv`;  // gradio专用 不要删除
    // const DEFAULT_CSV_URL = 'http://192.168.1.118:8186/file=E:/SimpleAI/SimpAI_win_dev_0509/SimpleSDXL/tags/danbooru_all.csv';    
    const TAGS_PER_PAGE = 32; // 每页显示的标签数量
    const FIXED_WEIGHT = 1.1; // 固定权重值

    // 全局UI文本配置
    const uiTexts = {
        searchInputPlaceholder: { zh: '搜索标签 (英文, 中文, 别名, 自定义分类...)', en: 'Search tags (English, Chinese, aliases, custom categories...)' },
        draggableHandleText: { zh: '标签助手 v 1.0 - 拖拽此处可移动', en: 'TagCart - Drag Here' },
        // [修改] 按钮组的文本
        formatButtonLabels: {
            'default': { zh: '逗号+空格', en: 'Default' },
            'spaces': { zh: '下划线转空格', en: 'Space for _' },
            'full': { zh: '空格+权重', en: 'Space + Weight' }
        },
        actionButtonLabels: {
            'append': { zh: '追加', en: 'Append' },
            'replace': { zh: '替换', en: 'Replace' }
        },
        targetButtonLabels: {
            'positive': { zh: '正向', en: 'Positive' },
            'negative': { zh: '反向', en: 'Negative' }
        },
        buttonTitles: {
            resetSearch: { zh: '清空搜索并重置类别', en: 'Clear search & reset categories' },
            copy: { zh: '复制到提示词框', en: 'Copy to Prompt' },
            nsfwFilter: { zh: 'NSFW 过滤', en: 'NSFW Filter' },
            clearAll: { zh: '清空已选', en: 'Clear All Selected' },
            floatBall: { zh: '点击显示标签助手', en: 'Click to show Tag Assistant' },
            toggleLanguage: { zh: '切换显示语言', en: 'Toggle Display Language' }
        },
        categoryFilterNames: {
            '-1': { zh: '全部', en: 'All' }, '0': { zh: '通用', en: 'General' }, '1': { zh: '作者', en: 'Artist' }, '3': { zh: '版权', en: 'Copyright' },
            '4': { zh: '角色', en: 'Character' }, '5': { zh: '元数据', en: 'Meta' }, '6': { zh: 'Kontext', en: 'Kontext' }
        },
        customCategoryFilterNames: { '人物数量': { zh: '人物数量', en: 'People' }, '画质': { zh: '画质', en: 'Quality' }, '反向': { zh: '反向', en: 'Negative' } },
        categoryMap: {
            0: { zh: '通用', en: 'General' }, 1: { zh: '作者', en: 'Artist' }, 3: { zh: '版权', en: 'Copyright' }, 4: { zh: '角色', en: 'Character' },
            5: { zh: '元数据', en: 'Meta' }, 6: { zh: 'Kontext指令', en: 'Kontext Command' }, 7: { zh: '内置分类1', en: 'Built-in Category 1' }, 8: { zh: '内置分类2', en: 'Built-in Category 2' }
        },
        tagTitleDefaults: {
            en: { noTranslation: 'None', noAliases: 'None', noCustomCategory: 'None', unknownCategory: 'Unknown Category' },
            zh: { noTranslation: '无', noAliases: '无', noCustomCategory: '无', unknownCategory: '未知类别' }
        }
    };

    const CATEGORY_MAP = Object.keys(uiTexts.categoryMap).reduce((acc, key) => { acc[key] = uiTexts.categoryMap[key].zh; return acc; }, {});
    
    // --- 全局状态变量 ---
    let allTags = [], filteredTags = [], selectedTags = [];
    let currentPage = 1, debounceTimer;
    let activeCategoryFilter = -1, isNsfwFilterActive = true, activeCustomCategoryFilter = null, displayEnglishOnly = false;
    
    // [修改] 用于按钮组状态的状态变量
    let activeFormat = 'default';
    let activeAction = 'append';
    let activeTarget = 'positive';

    // --- DOM 元素引用 ---
    let selectedTagsContainer, tagDisplayContainer, searchInput, resetSearchBtn, nsfwFilterBtn, clearAllBtn, copyBtn;
    let paginationContainer, tagFilterBtns, customCategoryFilterBtns, toggleLanguageBtn, floatBall, draggableContainer, draggableHandle;
    let formatBtnGroup, actionBtnGroup, targetBtnGroup; // 用于按钮组容器的引用

    // --- 初始化函数 ---
    function init() {
        console.log("init() started.");
        appRootInstance = document.createElement('div');
        appRootInstance.id = 'app-root';
        appRootInstance.className = 'w-[1000px] flex flex-col p-4 space-y-2 overflow-hidden min-h-[700px]';

        draggableContainer = document.createElement('div');
        draggableContainer.id = 'draggable-container';
        draggableContainer.className = 'flex flex-col space-y-2 p-4';
        draggableContainer.style.display = 'none';
        
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

        copyBtn = document.createElement('button');
        copyBtn.id = 'copy-btn';
        copyBtn.className = 'btn p-2 rounded-lg h-10 flex-shrink-0';
        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>'; // 文本将由 updateUIText 添加
        controlBar.appendChild(copyBtn);

        nsfwFilterBtn = document.createElement('button');
        nsfwFilterBtn.id = 'nsfw-filter-btn';
        nsfwFilterBtn.className = 'btn p-2 rounded-lg h-10 w-10 flex-shrink-0 active';
        nsfwFilterBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        controlBar.appendChild(nsfwFilterBtn);
        
        toggleLanguageBtn = document.createElement('button');
        toggleLanguageBtn.id = 'toggle-language-btn';
        toggleLanguageBtn.className = 'btn p-2 rounded-lg h-10 w-10 flex-shrink-0';
        toggleLanguageBtn.innerHTML = '<i class="fa-solid fa-language"></i>';
        controlBar.appendChild(toggleLanguageBtn);

        clearAllBtn = document.createElement('button');
        clearAllBtn.id = 'clear-all-btn';
        clearAllBtn.className = 'btn p-2 rounded-lg h-10 w-10';
        clearAllBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        controlBar.appendChild(clearAllBtn);

        const filterBtnsContainer = document.createElement('div');
        filterBtnsContainer.className = 'flex-shrink-0 flex gap-2';
        draggableContainer.appendChild(filterBtnsContainer);
        filterBtnsContainer.innerHTML = `
            <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md active" data-category="-1"></button> <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="0"></button>
            <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="1"></button> <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="3"></button>
            <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="4"></button> <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="5"></button>
            <button class="tag-filter-btn btn px-3 py-1 text-sm rounded-md" data-category="6"></button> <button class="custom-category-filter-btn btn px-3 py-1 text-sm rounded-md" data-custom-category="人物数量"></button>
            <button class="custom-category-filter-btn btn px-3 py-1 text-sm rounded-md" data-custom-category="画质"></button> <button class="custom-category-filter-btn btn px-3 py-1 text-sm rounded-md" data-custom-category="反向"></button>`;
        tagFilterBtns = filterBtnsContainer.querySelectorAll('.tag-filter-btn');
        customCategoryFilterBtns = filterBtnsContainer.querySelectorAll('.custom-category-filter-btn');

        tagDisplayContainer = document.createElement('div');
        tagDisplayContainer.id = 'tag-display-container';
        tagDisplayContainer.className = 'flex-grow grid grid-cols-8 grid-rows-4 gap-[6px] overflow-hidden p-1'; 
        draggableContainer.appendChild(tagDisplayContainer);

        const bottomWrapper = document.createElement('div');
        bottomWrapper.className = 'flex-shrink-0 flex justify-between items-center w-full mt-1';
        draggableContainer.appendChild(bottomWrapper);

        // [修改] 创建 otherControlBar 来容纳按钮组
        const otherControlBar = document.createElement('div');
        otherControlBar.id = 'other-control-bar';
        otherControlBar.className = 'flex items-center gap-4'; // gap-4 增加组间距
        bottomWrapper.appendChild(otherControlBar);

        // --- 创建按钮组 ---
        const createButtonGroup = (valueMap, defaultValue, groupClass) => {
            const groupContainer = document.createElement('div');
            groupContainer.className = `flex items-center gap-1 p-1 rounded-lg ${groupClass} custom-group-bg`;
            Object.keys(valueMap).forEach(value => {
                const btn = document.createElement('button');
                btn.className = 'btn px-3 py-1 text-sm rounded-md';
                btn.dataset.value = value;
                if (value === defaultValue) {
                    btn.classList.add('active');
                }
                groupContainer.appendChild(btn);
            });
            return groupContainer;
        };
        
        // 格式化按钮组
        formatBtnGroup = createButtonGroup(uiTexts.formatButtonLabels, activeFormat, 'format-group');
        otherControlBar.appendChild(formatBtnGroup);
        
        // 行为按钮组
        actionBtnGroup = createButtonGroup(uiTexts.actionButtonLabels, activeAction, 'action-group');
        otherControlBar.appendChild(actionBtnGroup);
        
        // 目标按钮组
        targetBtnGroup = createButtonGroup(uiTexts.targetButtonLabels, activeTarget, 'target-group');
        otherControlBar.appendChild(targetBtnGroup);

        paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        paginationContainer.className = 'flex-shrink-0 flex justify-center items-center gap-1';
        bottomWrapper.appendChild(paginationContainer);

        floatBall = document.createElement('div');
        floatBall.id = 'float-ball';
        floatBall.innerHTML = '<i class="fa-solid fa-tags"></i>';
        floatBall.style.display = 'flex';
        
        appRootInstance.appendChild(draggableContainer);
        appRootInstance.appendChild(floatBall);
        console.log("init() completed.");
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
            tagFilterBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.category, 10) === -1));
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
        
        // [修改] 按钮组的事件监听逻辑
        const setupButtonGroupListener = (groupElement, stateUpdater) => {
            groupElement.addEventListener('click', (e) => {
                const clickedButton = e.target.closest('button');
                if (!clickedButton) return;

                const value = clickedButton.dataset.value;
                if (value) {
                    stateUpdater(value); // 更新状态变量
                    // 更新UI
                    groupElement.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                    clickedButton.classList.add('active');
                }
            });
        };

        setupButtonGroupListener(formatBtnGroup, value => activeFormat = value);
        setupButtonGroupListener(actionBtnGroup, value => activeAction = value);
        setupButtonGroupListener(targetBtnGroup, value => activeTarget = value);


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
                tagFilterBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.category, 10) === -1));
                activeCategoryFilter = -1; 
                applyFiltersAndRender();
            });
        });

        toggleLanguageBtn.addEventListener('click', () => {
            displayEnglishOnly = !displayEnglishOnly; 
            toggleLanguageBtn.classList.toggle('active', displayEnglishOnly);
            updateUIText(displayEnglishOnly ? 'en' : 'zh');
        });

        // --- 拖拽事件 (保持不变) ---
        if (floatBall) { ['userSelect', 'webkitUserSelect', 'mozUserSelect', 'msUserSelect'].forEach(prop => floatBall.style[prop] = 'none'); }
        floatBall.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            let isFloatBallDragging = false;
            const startX = e.clientX;
            const startY = e.clientY;
            const dragThreshold = 5;
            const ballRect = floatBall.getBoundingClientRect();
            let offsetX = e.clientX - ballRect.left;
            let offsetY = e.clientY - ballRect.top;
            const onMouseMove = (moveEvent) => {
                if (!isFloatBallDragging) {
                    if (Math.abs(moveEvent.clientX - startX) > dragThreshold ||
                        Math.abs(moveEvent.clientY - startY) > dragThreshold) {
                        isFloatBallDragging = true;
                        floatBall.classList.add('dragging');
                    } else {
                        return;
                    }
                }
                if (isFloatBallDragging) {
                    let newX = moveEvent.clientX - offsetX;
                    let newY = moveEvent.clientY - offsetY;
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
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
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
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        floatBall.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            e.preventDefault();
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
                document.removeEventListener('touchcancel', onTouchEnd);
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
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
            document.addEventListener('touchcancel', onTouchEnd);
        }, { passive: false });

        let isDraggingContainer = false; let containerOffset = { x: 0, y: 0 };
        draggableHandle.addEventListener('mousedown', (e) => { if (e.button !== 0) return; isDraggingContainer = true; containerOffset = { x: e.clientX - draggableContainer.getBoundingClientRect().left, y: e.clientY - draggableContainer.getBoundingClientRect().top }; draggableHandle.style.cursor = 'grabbing'; e.preventDefault(); });
        document.addEventListener('mousemove', (e) => { if (!isDraggingContainer) return; let newX = e.clientX - containerOffset.x; let newY = e.clientY - containerOffset.y; const containerRect = draggableContainer.getBoundingClientRect(); const viewportWidth = window.innerWidth; const viewportHeight = window.innerHeight; if (newX < 0) newX = 0; if (newY < 0) newY = 0; if (newX + containerRect.width > viewportWidth) newX = viewportWidth - containerRect.width; if (newY + containerRect.height > viewportHeight) newY = viewportHeight - containerRect.height; draggableContainer.style.left = `${newX}px`; draggableContainer.style.top = `${newY}px`; draggableContainer.style.transform = 'none'; });
        document.addEventListener('mouseup', () => { isDraggingContainer = false; draggableHandle.style.cursor = 'grab'; });
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
                    positionDraggableContainer();
                    positionFloatBall();
                    applyFiltersAndRender(); 
                    updateUIText(displayEnglishOnly ? 'en' : 'zh');
                },
                error: (err) => { 
                    console.error("加载或解析CSV时出错:", err);
                }
            });
        } catch (err) {
            console.error("加载或解析CSV时出错:", err);
        }
    }

    function positionDraggableContainer() {
        const containerWidth = draggableContainer.offsetWidth; 
        const containerHeight = draggableContainer.offsetHeight;
        const initialLeft = (window.innerWidth - containerWidth) / 3;
        const initialTop = (window.innerHeight - containerHeight) / 2;
        draggableContainer.style.top = `${initialTop}px`;
        draggableContainer.style.left = `${initialLeft}px`;
        draggableContainer.style.transform = 'none'; 
    }

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
            const displayText = displayEnglishOnly ? tag.name.replace(/_/g, ' ') : (tag.translation ? tag.translation : tag.name.replace(/_/g, ' '));
            tagEl.className = 'tag-item tag-interactive px-2 py-1 rounded-md cursor-pointer text-xs flex items-center justify-center';
            tagEl.dataset.category = tag.category; 
            tagEl.dataset.tagName = tag.name; 
            tagEl.title = generateTagTitle(tag); 
            const textSpan = document.createElement('span');
            textSpan.textContent = displayText;
            textSpan.style.cssText = 'overflow: hidden; white-space: nowrap; text-overflow: ellipsis; min-width: 0;';
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

        if (activeCategoryFilter !== -1) tempFilteredTags = tempFilteredTags.filter(tag => tag.category === activeCategoryFilter);
        if (activeCustomCategoryFilter) tempFilteredTags = tempFilteredTags.filter(tag => tag.customCategory.toLowerCase().includes(`内置分类-${activeCustomCategoryFilter}`.toLowerCase()));
        if (isNsfwFilterActive) tempFilteredTags = tempFilteredTags.filter(tag => !tag.customCategory.toLowerCase().includes('内置分类-禁'));
        if (query) tempFilteredTags = tempFilteredTags.filter(tag => tag.name.toLowerCase().includes(query) || tag.aliases.toLowerCase().includes(query) || tag.translation.toLowerCase().includes(query) || tag.customCategory.toLowerCase().includes(query));

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
    
    
    // [修改] 更新 formatTags 函数
    function formatTags() {
        return selectedTags.map(tag => {
            let tagName = tag.name;
            // 'spaces' 和 'full' 格式都需要转换下划线
            if (activeFormat === 'spaces' || activeFormat === 'full') {
                tagName = tagName.replace(/_/g, ' '); 
            }
            // 'full' 格式需要添加权重
            if (activeFormat === 'full') {
                tagName = `(${tagName}:${FIXED_WEIGHT})`; 
            }
            return tagName;
        }).join(', '); 
    }

    // [修改] copyTagsToClipboard 函数现在读取状态变量
    function copyTagsToClipboard() {
        const formattedString = formatTags(); 
        if (!formattedString) return; 

        const targetId = activeTarget === 'positive' ? 'positive_prompt' : 'negative_prompt';
        const promptTextarea = document.querySelector(`#${targetId} textarea`);

        if (promptTextarea) {
            if (activeAction === 'append') {
                promptTextarea.value += (promptTextarea.value ? ', ' : '') + formattedString;
            } else { // activeAction === 'replace'
                promptTextarea.value = formattedString;
            }
            promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            console.warn(`未能找到ID为 "${targetId}" 的Gradio文本框。`);
        }

        navigator.clipboard.writeText(formattedString).catch(err => console.error('复制失败', err));
    }
    // [已修正] 请用这个完整的函数替换掉您代码中现有的 updateUIText 函数
    function updateUIText(lang) {
        searchInput.placeholder = uiTexts.searchInputPlaceholder[lang];
        draggableHandle.textContent = uiTexts.draggableHandleText[lang];
        // [修正] 将复制按钮的文本更新也整合进来
        copyBtn.innerHTML = `<i class="fa-solid fa-copy"></i>&nbsp;${uiTexts.buttonTitles.copy[lang]}`;

        // 更新按钮组文本
        const updateButtonGroupText = (groupElement, labels) => {
            groupElement.querySelectorAll('button').forEach(btn => {
                const value = btn.dataset.value;
                if (labels[value]) {
                    btn.textContent = labels[value][lang];
                }
            });
        };

        updateButtonGroupText(formatBtnGroup, uiTexts.formatButtonLabels);
        updateButtonGroupText(actionBtnGroup, uiTexts.actionButtonLabels);
        updateButtonGroupText(targetBtnGroup, uiTexts.targetButtonLabels);

        // 更新其他按钮悬停提示
        resetSearchBtn.title = uiTexts.buttonTitles.resetSearch[lang];
        nsfwFilterBtn.title = uiTexts.buttonTitles.nsfwFilter[lang];
        clearAllBtn.title = uiTexts.buttonTitles.clearAll[lang];
        floatBall.title = uiTexts.buttonTitles.floatBall[lang];
        toggleLanguageBtn.title = uiTexts.buttonTitles.toggleLanguage[lang];

        // [已恢复] 恢复对分类过滤按钮文本的更新
        tagFilterBtns.forEach(btn => {
            const category = btn.dataset.category;
            if (uiTexts.categoryFilterNames[category]) {
                btn.textContent = uiTexts.categoryFilterNames[category][lang];
                // 同时更新 CATEGORY_MAP 以确保 generateTagTitle 使用正确的语言
                if (uiTexts.categoryMap[category]){
                    CATEGORY_MAP[category] = uiTexts.categoryMap[category][lang] || '';
                }
            }
        });

        // [已恢复] 恢复对自定义分类过滤按钮文本的更新
        customCategoryFilterBtns.forEach(btn => {
            const customCategory = btn.dataset.customCategory;
            if (uiTexts.customCategoryFilterNames[customCategory]) {
                btn.textContent = uiTexts.customCategoryFilterNames[customCategory][lang];
            }
        });

        // 重新渲染标签以更新其标题和可能改变的显示文本
        renderTags();
        renderSelectedTags();
    }

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
    init();
    applyThemeFromUrl(); 
    setupEventListeners();

    if (isNsfwFilterActive) nsfwFilterBtn.classList.add('active');
    
    new Sortable(selectedTagsContainer, {
        animation: 150, 
        ghostClass: 'ghost-class', 
        onEnd: (evt) => {
            const movedTag = selectedTags.splice(evt.oldIndex, 1)[0];
            selectedTags.splice(evt.newIndex, 0, movedTag);
        }
    });

    loadCSV(DEFAULT_CSV_URL);
    updateUIText(displayEnglishOnly ? 'en' : 'zh');
}

// ==================== 移动设备检测 ====================
function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
}

// ==================== Gradio 初始化和启动 ====================
window.addEventListener('load', () => {
    if (isMobileDevice()) {
        console.log("当前设备为移动设备，悬浮球组件不显示。");
        return;
    }
    console.log("Window loaded. Attempting to initialize tag assistant.");
    initializeTagAssistantLogic(); 

    const gradioContainer = typeof gradioApp === 'function' ? gradioApp() : null;
    const appRootElement = appRootInstance; 

    if (gradioContainer && appRootElement) {
        gradioContainer.appendChild(appRootElement);
    } else if (appRootElement) {
        document.body.appendChild(appRootElement);
    } else {
        console.error("Error: appRootElement (appRootInstance) not found after initializeTagAssistantLogic.");
    }
});
