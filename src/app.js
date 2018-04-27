/*
[目錄]
	-layoutLoad:模板載入用，會判斷瀏覽器hash，載入不同頁內容
*/
var pagesdata = [];
var debug = true;

function layoutLoad() {
    try {
        contentSDK.getDeviceId()
    } catch (e) {}
    //載入頁碼資訊
    $.ajax({
        url: './asset/json/page.json',
        type: 'GET',
        dataType: 'json',
        async: true,
        success: function (data) {
            pagesdata = data;
            print('pagesaData success load!');
        },
        error: function () {
            print('pagesData error!');
        }
    }).done(function () {
        //變數
        var header = './asset/page/header.html';
        var footer = './asset/page/footer.html';
        var hash = setHash();
        //載入
        $.get(header, function (data) {
            renderTemplate({
                "fn": 'main',
                "sub": ''
            }, 'header', data);
        }).done(function () {
            $('.list-' + hash.navType).addClass('active');
        });
        $.get(footer, function (data) {
            $('footer').html(data);
        });
        $.get('./asset/page/' + hash.tempUrl + '.html', function (data) {
            if (hash.renderType === "tmp") {
                renderTemplate(hash, '.container', data);
            } else {
                $('.container').html(data);
            }
        }).fail(function () {
            //找不到頁面
            window.location.hash = 404;
            pagechange();
            print("page can't find.");
        });
    });
}

//頁面切換
function pagechange(array) {
    print("page change...");
    var hash = setHash();
    print(hash);
    $.get('./asset/page/' + hash.tempUrl + '.html', function (data) {
        $('.container').animate({
            opacity: 0
        }, 50, function () { //內容區淡出
            if (hash.renderType === "tmp") {
                renderTemplate(hash, '.container', data);
            } else {
                $('.container').html(data);
            }
            //頁面回到頂部
            $('body').scrollTop(0);
            //首次進入才會看到換燈片，之後就縮小
            var jh = hash.fn === "main" ? 'auto' : 0;
            $('.jumbtron').height(jh);
        });
    }).done(function () {
        //完成後切換選單列標籤
        var tag = hash.pageTag || 0;
        print(tag);
        $('#tags').find('.tag-item').eq(tag).addClass('active');
        $('.sub-menu a').removeClass('active');
        $('.list-' + hash.navType).addClass('active');
        //動作完成，內容區淡入
        $('.container').animate({
            opacity: 1
        }, 50);
        print("page change finish! now is " + hash.fn + '/' + hash.sub);
    }).fail(function () {
        //找不到頁面
        window.location.hash = 404;
        pagechange();
        print("page can't find.");
    });
}

function getItem(name, id, cb) {
    if (name.match(/book|item|ebook/)) {
        name = 'focus'
    }
    if (name.match(/live/)) {
        name = 'course'
    }
    console.log(name);
    $.getJSON('./asset/json/' + name + '.json', function (json) {
            if (id === 'list') {
                cb(json);
            } else {
                cb(json.find(function (e) {
                    return e.id === id
                }));
            }
        })
        .fail(function () {
            print('item json fail load');
        });
}

function renderTemplate(hashObj, toWhere, data) {
    var name = hashObj.fn;
    var id = hashObj.sub;
    var tag = hashObj.pageTag || 0;
    var member = '';
    var logState = 'unlogin';
    if (isLogin('user')) {
        member = window.localStorage.getItem('user');
        member = member.split('@')[0];
        member = member.length > 8 ? member.substr(0, 8) + '...' : member;
        logState = 'islogin';
    }
    getItem(name, id, function (e) {
        var html = $.parseHTML(data.replace(/\r\n|\n|\s/g, " "), true);
        var htmlText = html.find(function (e) {
            return e.nodeName === "TEMPLATE"
        });
        htmlText = htmlText ? htmlText.innerHTML : '找不到網頁';
        var scriptText = html.find(function (e) {
            return e.nodeName === "SCRIPT"
        });
        scriptText = scriptText ? scriptText.outerHTML : '';
        var spArry = htmlText.split(/&lt;%|<%/);
        var tmpHtmlStr = '';
        for (var i = 0; i < spArry.length; i++) {
            var istr = spArry[i];
            var replacedText = istr.replace(/(.)*%&gt;|(.)*%>/, "TEMP_DATA" + i);
            tmpHtmlStr = tmpHtmlStr + replacedText;
        }
        for (var i = 1; i < spArry.length; i++) {
            var sp = spArry[i].split(/%&gt;|%>/);
            var value = sp[0].trim();
            var itemdata;
            if (value.includes('for')) {
                var c = value.slice(value.indexOf('(') + 1, value.indexOf(')'));
                var csp = c.split('*');
                var arrStr = csp[1].trim();
                var arr = arrStr === 'self' ? e : e[arrStr];
                var re = new RegExp('\\$' + csp[0].trim(), 'g');
                var tmp = value.slice(value.indexOf('=') + 1);
                var contain = "";
                for (t = 0; t < arr.length; t++) {
                    var text = tmp;
                    if (text.includes('$' + csp[0] + '.')) {
                        var tmpRe = new RegExp('\\$' + csp[0] + '\\.?[A-Za-z0-9]*' + '\\.?[A-Za-z0-9]*', 'g');
                        var tmpAry = tmp.match(tmpRe);
                        for (q = 0; q < tmpAry.length; q++) {
                            var tSlc = tmpAry[q];
                            tSlc = tSlc.replace(/\$item/g, t);
                            var tSlcSp = tSlc.split('.');
                            var strg = '';
                            for (g = 1; g < tSlcSp.length; g++) {
                                strg = strg + '\\.?' + tSlcSp[g];
                            }
                            var thisRe = new RegExp('\\$' + csp[0] + strg, 'g');
                            var tmpValue = renderByDot(tSlcSp, e);
                            text = text.replace(thisRe, tmpValue);
                        }
                    }
                    var text = text.replace(re, arr[t]);
                    contain = contain + text;
                }
                value = "(" + value + ")";
                itemdata = contain;
            } else if (value.includes('.')) {
                itemdata = renderByDot(value.split('.'), e);
            } else {
                itemdata = e[value];
                if (value === 'TAG') {
                    itemdata = tag
                }
                if (value === 'MEMBER') {
                    itemdata = member
                }
                if (value === 'LOGSTATE') {
                    itemdata = logState
                }
            }
            var reg = new RegExp("TEMP_DATA(" + i + ")");
            tmpHtmlStr = tmpHtmlStr.replace(reg, itemdata);
        }
        $(toWhere).html(tmpHtmlStr + scriptText);
    })
}

function renderByDot(vsp, data) {
    var item = data[vsp[0]];
    for (var a = 1; a < vsp.length; a++) {
        item = item[vsp[a]];
    }
    return item;
}

//取hash值並回傳中英文名稱
function setHash(cb) {
    var obj = new Object();
    obj.fn = '404';
    obj.sub = '';
    obj.tempUrl = 'other/404';
    obj.navType = '';
    obj.renderType = 'dir';
    obj.pageType = '';
    obj.pageTag = 'all';
    var hash = window.location.hash.substr(1);
    print("[hash = " + hash + "]");
    if (pagesdata.length > 0 && hash.length > 0) {
        var hashArr = hash.split('/');
        if (hashArr[1] || hashArr.length > 1) {
            obj.pageType = hashArr[1] === 'list' ? 'list' : ':id';
            obj.pageTag = hashArr[1] === 'list' ? hashArr[2] : obj.pageTag;
            console.log('pageType=' + obj.pageType);
            console.log('pageTag=' + obj.pageTag);
        }
        var pageObj = pagesdata.find(function (e) {
            return e.fn === hashArr[0] && e.sub === obj.pageType
        });
        if (pageObj) {
            document.title = pageObj.zh + " | Linfinity";
            obj.fn = pageObj.fn;
            obj.sub = hashArr[1] ? hashArr[1] : pageObj.sub;
            obj.tempUrl = pageObj.loc;
            obj.navType = pageObj.short;
            obj.renderType = pageObj.type;
        } else {
            document.title = "頁面不見了！ | Linfinity";
        }
    } else {
        document.title = "Linfinity";
        obj.fn = "main";
        obj.tempUrl = "main";
        obj.renderType = 'tmp';
    }
    return obj
}

//
function include(callback) {
    $('*[data-html]').each(function (index, el) {
        var html = $(el).attr('data-html');
        $.get('./asset/page/' + html, function (data) {
            $(el).html(data);
        }).done(callback);
    });
}

function callImgLoad() {
    dataImg();
    dataBg();
}

//data標籤載入圖片方法
function dataImg() {
    $('*[data-img]').each(function (index, el) {
        var i = $(el);
        if (i.children('img').length <= 0) {
            i.append("<img src=" + i.attr('data-img') + ">");
        }
    });
}

function dataSrc() {
    $('img[data-src]').each(function (index, el) {
        el.src = el.dataset.src;
    });
}

//data標籤載入圖片方法
function dataBg() {
    $('*[data-bg]').each(function (index, el) {
        var i = $(el);
        i.css("background-image", 'url(' + i.attr('data-bg') + ')');
    });
}

//側邊欄位動態效果
function layoutSideTrans() {
    var los = $('.layout-side'); //取側邊
    //取視窗寬高
    var $w = $(window);
    sideTopfix();

    $w.on('scroll', function () {
        sideTopfix();
    });
    $w.on('resize', function () {
        sideTopfix();
    });

    function sideTopfix() {
        var topNow = setTopNow();
        los.css('top', topNow);
    }

    function setTopNow() {
        var topNow = 0;
        var e;
        var wW = window.innerWidth;
        var wH = window.innerHeight;
        var stNow = window.scrollY;
        var pdH = $('.page-data').height(); //頁面標題高度
        var hrH = $('header').height(); //頭部高度
        var sH = los.outerHeight(); //側邊高度
        var mH = $('.layout-main').outerHeight(); //主區高度
        var m = mH - sH; //主側區高度差
        var i = sH + hrH + pdH - wH; //視窗底與側邊底觸碰高度
        if (wW > 767) {
            if (sH < mH) {
                e = stNow - i;
            } else {
                e = 0;
            }
            if (e > 0 && e < m) {
                topNow = e;
            } else if (e <= 0) {
                topNow = 0;
            } else {
                topNow = m;
            }
        } else {
            topNow = 0;
        }
        return topNow;
    }
}

//側邊欄位位置重置
function sideReset() {
    var los = $('.layout-side'); //取側邊
    //取視窗寬高
    var $w = $(window);
    var wW = $w.width();
    var wH = $w.height();
    //取內容高度
    var pdH = $('.page-data').height(); //頁面標題高度
    var hrH = $('header').height(); //頭部高度
    var sH = los.outerHeight(); //側邊高度
    var mH = $('.layout-main').outerHeight(); //主區高度
    var m = mH - sH; //主側區高度差
    var i = sH + hrH + pdH - wH; //視窗底與側邊底觸碰高度

    var topNow; //高度初始值
    var stNow = window.scrollY;
    var e;
    if (wW > 767) {
        if (sH < mH) {
            e = stNow - i;
        } else {
            e = 0;
        }
        if (e > 0 && e < m) {
            topNow = e;
        } else if (e <= 0) {
            topNow = 0;
        } else {
            topNow = m;
        }
    } else {
        topNow = 0;
    }
    los.css('top', topNow);
}

//小型幻燈片 側邊欄用
function sliderReel(selector) {
    var sl = $(selector);
    var img = sl.find('.sl-images>li');

    var nav = sl.children('.sl-nav');

    var str = 0;
    var next;
    var end = img.length - 1;
    var delaytime = 5000;

    for (var i = 0; i <= end; i++) {
        nav.append('<li></li>');
    }
    var li = nav.children('li');
    $(img[0]).addClass('active');
    $(li[0]).addClass('active');
    timeout();

    function timeout() {
        setTimeout(function () {
            $(li[str]).toggleClass('active');
            $(img[str]).toggleClass('active');
            if (str >= end) {
                str = 0;
                next = 0;
            } else {
                str++;
                next = str;
            }
            $(img[next]).toggleClass('active');
            $(li[next]).toggleClass('active');

            timeout();
        }, delaytime);
    }
}

//頁首滿版展示動畫方法
function jumbtronslide(selector) {
    var sl = $(selector);
    var img = sl.find('.j-img>div');

    var str = 0;
    var next;
    var end = img.length - 1;
    var delaytime = 10000;

    $(img[0]).addClass('active');
    timeout();

    function timeout() {
        setTimeout(function () {
            $(img[str]).toggleClass('active');
            if (str >= end) {
                str = 0;
                next = 0;
            } else {
                str++;
                next = str;
            }
            $(img[next]).toggleClass('active');
            timeout();
        }, delaytime);
    }
}

//
function superImgSS(selector) {
    var sl = $(selector);
    var img = sl.find('li');
    var span = sl.find('span');

    var str = 0;
    var next;
    var end = img.length - 1;

    var nav = $('<div>').addClass('nav');
    for (var i = 0; i <= end; i++) {
        nav.append('<span>');
    }
    nav.appendTo(sl);
    var span = sl.find('span');

    $(img[0]).addClass('active');
    $(span[0]).addClass('active');

    sl.children('.prev').click(s_prev);
    sl.children('.next').click(s_next);
    sl.find('.nav>span').click(s_chg);

    function s_prev() {
        sl.find('li.active').removeClass('active');
        sl.find('span.active').removeClass('active');
        if (str <= 0) {
            str = end;
            next = end;
        } else {
            str--;
            next = str;
        }
        $(img[next]).toggleClass('active');
        $(span[next]).toggleClass('active');
    }

    function s_next() {
        sl.find('li.active').removeClass('active');
        sl.find('span.active').removeClass('active');
        if (str >= end) {
            str = 0;
            next = 0;
        } else {
            str++;
            next = str;
        }
        $(img[next]).toggleClass('active');
        $(span[next]).toggleClass('active');
    }

    function s_chg() {
        var a = $(this).index();
        sl.find('li.active').removeClass('active');
        sl.find('span.active').removeClass('active');
        str = a;
        $(img[a]).toggleClass('active');
        $(span[a]).toggleClass('active');
    }
}

//橫向物件左右切換
function linesItem(main_selector, ctrl_selector) {
    var lsb = $(main_selector);
    var lsc = $(ctrl_selector);

    var ls_list = lsb.children('ul');
    var ls_item = ls_list.children('li');

    var lscRL = $('<span class="ls_left"></span><span class="ls_right"></span>');

    var isLsc = lsc[0].childNodes.length > 0;
    if (!isLsc) {
        lsc.append(lscRL);
    }
    lsc.on('click', '.ls_right', function () {
        ls_item_next()
    });
    lsc.on('click', '.ls_left', function () {
        ls_item_back()
    });
    var px;
    lsb.on('touchstart', function (event) {
        event.preventDefault();
        px = event.changedTouches[0].pageX;
    }).on('touchend', function (event) {
        event.preventDefault();
        var dir = event.changedTouches[0].pageX - px;
        if (dir > 0) {
            ls_item_back();
        } else {
            ls_item_next();
        }
    });

    var itemShowLenth = ls_list.width() / ls_item.outerWidth(); //item顯示數量(隨RWD改變)
    var itemW = ls_list.width() / itemShowLenth; //item寬度
    var itemNum = ls_item.length; //item總數
    var itemStart = itemShowLenth; //設定起始值

    $(window).resize(function () {
        itemShowLenth = ls_list.width() / ls_item.outerWidth(); //item顯示數量(隨RWD改變)
        itemW = ls_list.width() / itemShowLenth; //item寬度
        itemNum = ls_item.length; //item總數
        itemStart = itemShowLenth; //設定起始值
        ls_list.stop().animate({
            "left": 0
        }, 300);
    });

    var ls_item_back = function () {
        if (itemStart > itemShowLenth) {
            itemStart = --itemStart;
            ls_list.stop().animate({
                "left": (itemStart - itemShowLenth) * -itemW
            }, 300);
        } else {
            itemStart = itemShowLenth;
        }
    }

    var ls_item_next = function () {
        if (itemStart < itemNum) {
            itemStart = ++itemStart;
            ls_list.stop().animate({
                "left": (itemStart - itemShowLenth) * -itemW
            }, 300);
        } else {
            itemStart = itemNum;
        }
    }
}



//文字跑馬燈>未使用
function marquee(selector) {
    var i = $(selector);
    var iW = i[0].offsetWidth;
    var isW = i[0].scrollWidth;
    if (isW > iW) {
        i.addClass('marquee');
    } else {
        i.removeClass('marquee');
    }
    $(window).resize(function () {
        iW = i[0].offsetWidth;
        isW = i[0].scrollWidth;
        if (isW > iW) {
            i.addClass('marquee');
        } else {
            i.removeClass('marquee');
        }
    });
}


//實驗性
function renderByJson(callback) {
    var dj = $('*[data-json]');
    for (var b = 0; b < dj.length; b++) {
        var el = dj[b];
        var jsonPath = './asset/json/' + el.dataset.json;
        var type = el.dataset.filter || 'all';
        $(el).removeAttr('data-json');
        getJson(jsonPath, type, function (jsonArray) {
            var max;
            if (el.dataset.max && jsonArray.length > el.dataset.max) {
                max = el.dataset.max
            } else {
                max = jsonArray.length
            }
            if (el.dataset.mode === 'shuffle') {
                shuffle(jsonArray)
            }
            for (var s = 0; s < max; s++) {
                var json = jsonArray[s];
                var html = el.outerHTML.replace(/\n/g, '');
                var paramsArray = html.match(/{{[A-Za-z0-9_.]*}}/g);
                var elLimit = $(el).find('*[data-length]');
                var elliparam = elLimit.text().slice(2, -2);
                var maxlength = elLimit.attr('data-length');
                paramsArray.forEach(function (param, i) {
                    param = param.slice(2, -2);
                    var arr = param.split('.');
                    var getParam = renderByDot(arr, json);
                    if (param === elliparam) {
                        var ol = getParam.length;
                        getParam = ol > maxlength ? getParam.substr(0, maxlength) + '...' : getParam;
                    }
                    var RegParam = new RegExp('{{' + param + '}}', 'g');
                    html = html.replace(RegParam, getParam);
                });
                var div = document.createElement('div');
                div.innerHTML = html;
                var newNode = div.firstChild;
                el.parentNode.appendChild(newNode);
            }
            $(el).remove();
        });
    }
    dataSrc();
    var hash = setHash();
    var tag = hash.pageTag || 0;
    $('.tag-item').eq(tag).addClass('active');
    try {
        callback()
    } catch (e) {}
}

function getJson(path, type, cb) {
    $.ajax({
            url: path,
            dataType: 'json',
            async: false
        })
        .done(function (data) {
            if (type > 0) {
                print("getJsonType=" + type);
                data = $.grep(data, function (n) {
                    return n.type == type
                });
            }
            cb(data);
        })
        .fail(function () {
            console.log("error");
        })
}



function wsaStatusCheck() {
    var isList = window.location.hash.indexOf('list') >= 0;
    var check;
    if (isList) {
        check = 'list';
        articleClose();
    } else {
        var id = window.location.hash.split('/')[1];
        check = 'load';
        articleLoadById(id)
    }
}

//焦點>單一文章初始化載入
function articleLoad(evt) {
    var name = evt.currentTarget.dataset.name;
    var articleId = name.split('wsa')[1];
    loadNewArticle(articleId, function () {
        $('body').css('overflow', 'hidden');
        $('.ws-archive').fadeIn('400', function () {
            var wsaH = $('.wsa-item').outerHeight();
            var wsaMtop = parseInt($('.wsa-item').css('margin-top'));
            $('.wsa-mask').height(wsaH + wsaMtop);
        });
    })
}

function articleLoadById(id) {
    loadNewArticle(id, function () {
        $('body').css('overflow', 'hidden');
        $('.ws-archive').fadeIn('400', function () {
            var wsaH = $('.wsa-item').outerHeight();
            var wsaMtop = parseInt($('.wsa-item').css('margin-top'));
            $('.wsa-mask').height(wsaH + wsaMtop);
        });
    })
}

//焦點>單一文章關閉
function articleClose() {
    $('.ws-archive').fadeOut('400', function () {
        $('body').css('overflow', 'auto');
        $('.wsa-container').empty();
        var isList = window.location.hash.indexOf('list') >= 0;
        if (!isList) {
            window.location.hash = 'work/list';
        }
    });
}

//焦點>單一文章切出
function articleTurn(evt) {
    var i = $('.wsa-item');
    var w = i.outerWidth();
    var dw = $(window).width();
    i.fadeOut('400', function () {
        $('.wsa-container').empty();
        loadNewArticle('001', function () {
            $('.ws-archive').scrollTop(0);
        });
    });
}

function archLast(evt) {
    getItem('case', 'list', function (res) {
        var i = $('.wsa-item');
        var thisID = i.attr('data-name');
        var nowIndex = res.findIndex(function (e) {
            return e.id === thisID
        });
        var max = res.length - 1;
        var lastIndex = nowIndex - 1;
        lastIndex = lastIndex < 0 ? max : lastIndex;
        var w = i.outerWidth();
        var dw = $(window).width();
        i.fadeOut('300', function () {
            $('.wsa-container').empty();
            loadNewArticle(res[lastIndex].id, function () {
                $('.ws-archive').scrollTop(0);
            });
        });
    });
}

function archNext(evt) {
    getItem('case', 'list', function (res) {
        var i = $('.wsa-item');
        var thisID = i.attr('data-name');
        var nowIndex = res.findIndex(function (e) {
            return e.id === thisID
        });
        var max = res.length - 1;
        var nextIndex = nowIndex + 1;
        nextIndex = nextIndex > max ? 0 : nextIndex;
        var w = i.outerWidth();
        var dw = $(window).width();
        i.fadeOut('300', function () {
            $('.wsa-container').empty();
            loadNewArticle(res[nextIndex].id, function () {
                $('.ws-archive').scrollTop(0);
            });
        });
    });
}

//焦點>單一新文章再載入
function loadNewArticle(id, cb) {
    $.get('./asset/page/ws/work-article.html', function (data) {
        var obj = new Object();
        obj.fn = 'case';
        obj.sub = id;
        renderTemplate(obj, '.wsa-container', data)
    }).done(function () {
        cb();
    });
}



//焦點>載入更多文章
function moreItem() {
    var n = $('.brick').length;
    var loadnum = 4;
    $.get('./asset/json/case.json', function (data) {
        var itemTmp = $('.brick').eq(0);
        var newbox = $('<div></div>');
        var d = data.length - n;
        loadnum = d >= loadnum ? loadnum : d;
        for (var a = n; a < n + loadnum; a++) {
            var i = itemTmp.clone();
            var item = data[a];
            i.find('.bk-cover>img').attr("src", item.pic);
            i.find('.bk-title').text(item.title);
            var des = item.des.length > 40 ? item.des.substr(0, 40) + '...' : item.des;
            i.find('.bk-text').text(des);
            i.find('.bk-cover').attr('data-name', 'wsa' + item.id);
            i.find('.bk-title').attr('data-name', 'wsa' + item.id);
            i.find('.bk-text').attr('data-name', 'wsa' + item.id);
            newbox.append(i);
        }
        $('.wall').append(newbox);
        $('.wall').imagesLoaded(function () {
            $('.wall').masonry('appended', newbox);
        });
    });
}

//訊息框()
function supermsg(input) {
    $.get('./asset/page/msgbox/msgbox_' + input + '.html', function (i) {
        $('.msg-box').html(i);
    }).done(function () {
        supermsgToggle();
        $('.msg-box').on('click', '.msg-close', function () {
            supermsgToggle();
        }).on('click', '.cancel', function (e) {
            e.preventDefault();
            supermsgToggle();
        }).on('click', '.submit', function (e) {
            e.preventDefault();
            supermsgToggle();
        });
    });
}

//訊息框開關
function supermsgToggle() {
    var b = $('body');
    b.toggleClass('on');
    if (b.is('on')) {
        $('.msg-box').empty();
    }
    $('.msg-box').off();
}

//右側文章開關
function sideArchiveToggle(event) {
    var nav = $(event.target.parentElement);
    var ul = nav.children('ul');
    ul.slideToggle(400, function () {
        sideReset();
    });
    nav.toggleClass('active');
}

//選單置頂方法
function giveFixed(h) {
    var wT = document.body.scrollTop;
    var wW = window.innerWidth > 767;
    var sm = $('.sub-menu');
    if (wW) {
        if (wT >= h) {
            sm.addClass('nav-fixed');
            var h = $('.nav-fixed').height();
            $('.main-menu').css('margin-bottom', h);
        } else {
            sm.removeClass('nav-fixed');
            $('.main-menu').css('margin-bottom', 0);
        }
    } else {
        $('.main-menu').css('margin-bottom', 0);
    }
}

//行動裝置側邊選單開關
function toggleMenu() {
    $('.menu').toggleClass('active');
    $('body').toggleClass('active');
}

//頁首元件高度修正
function headerFix() {
    var topNav = $('.top-nav'); //頂端巡航列
    var mMenu = $('.main-menu'); //主目錄層
    scrlH = topNav.outerHeight() + mMenu.outerHeight();
    giveFixed(scrlH);
}

//載入頁首後執行
function headerLoad() {
    headerFix(); //選單列置頂
    callImgLoad();
    jumbtronslide('.jumbtron'); //大屏幕動畫
}

//行動版側邊選單開合
function mobiletagToggle() {
    var t = $('.menu-list>ul').stop(true);
    t.toggleClass('active');
    if (!t.hasClass('active')) {
        t.animate({
            height: 0
        }, 500);
    } else {
        t.animate({
            height: t.prop('scrollHeight')
        }, 500);
    }
}

//購物車tab切換
function cartTabToggle() {
    var NOW = $(this).index();
    if (NOW == 1) {
        $(".cart_wrapper .cart_right").fadeOut();
        $("#cart_all .cart_box").fadeOut(400);
        $("#cart_all .cart_box").eq(NOW).stop().fadeIn(400);
        $("#cart_menu li").removeClass().eq(NOW).addClass("cart_nowtab");
    }
    if (NOW == 0) {
        $(".cart_wrapper .cart_right").fadeIn();
        $("#cart_all .cart_box").fadeOut(400);
        $("#cart_all .cart_box").eq(NOW).stop().fadeIn(400);
        $("#cart_menu li").removeClass().eq(NOW).addClass("cart_nowtab");
    }
}

//自訂輸入框
function renderNumInput() {
    var numinput = $('.numinput');
    var input = '<input type="number" value="1" placeholder="請輸入數量" maxlength="3" min="1" max="999" />';
    var btnadd = '<button class="num-add" onclick="numChg(event)">+</button>';
    var btnmin = '<button class="num-minus" onclick="numChg(event)">-</button>';
    var ctrl = $('<span class="numctrl"></span>').append(btnadd + btnmin);
    numinput.append(input).append(ctrl);
}

//
function numChg(event) {
    event.preventDefault();
    var orginValue = event.target.parentElement.previousElementSibling.value;
    if (orginValue > 0 && orginValue < 999) {
        var btntype = event.target.innerText + '1';
        var newValue = parseInt(orginValue) + parseInt(btntype);
        event.target.parentElement.previousElementSibling.value = newValue;
    } else if (orginValue = 0 || orginValue < 999) {
        event.target.parentElement.previousElementSibling.value = 1;
    } else {
        event.target.parentElement.previousElementSibling.value = 0;
    }
}

//
function goTop() {
    $('body').animate({
        scrollTop: 0
    }, 500);
}

//
function showShareLinks(e) {
    var links = $('<div class="share-links"><ul><li class="fb"></li><li class="tr"></li><li class="gp"></li><li class="wb"></li></ul>');
    $(e.target).append(links);
}

//
function InsertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

//
function multiSelect(e) {
    e.preventDefault();
    $(e.target.parentNode.parentNode).toggleClass('selected');
    $(e.target).toggleClass('cancel');
    if ($(e.target).hasClass('cancel')) {
        $(e.target).text('取消');
    } else {
        $(e.target).text('選購');
    }
}

//
function multiprdbarFixed() {
    mpb = $('.multiprdbar');
    var mpbTop = mpb.offset().top;
    console.log(mpbTop);
    $(window).scroll(function () {
        var wT = $(this).scrollTop();
        if (wT >= mpbTop) {
            mpb.addClass('fixed');
        } else {
            mpb.removeClass('fixed');
        }
    });
}


function print(something) {
    if (debug) {
        return console.log(something)
    }
}

function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}

function isLogin(member) {
    var stg = window.localStorage;
    var islogin = false;
    var b = stg.getItem(member);
    if (b) {
        islogin = true;
    }
    return islogin
}