/*!
	SlickNav Responsive Mobile Menu
	(c) 2013 Josh Cope
	licensed under GPL and MIT
*/
(function (e, t, n) {
    var r = {
        label: "MENU",
        duplicate: true,
        duration: 200,
        easingOpen: "swing",
        easingClose: "swing",
        closedSymbol: "&#9658;",
        openedSymbol: "&#9660;",
        prependTo: "body",
        parentTag: "a",
        closeOnClick: false,
        allowParentLinks: false
    }, i = "slicknav", s = "slicknav";
    e.fn[i] = function (n) {
        return this.each(function () {
            function h(e) {
                var t = e.data("menu");
                if (!t) {
                    t = {};
                    t.arrow = e.children("." + s + "_arrow");
                    t.ul = e.next("ul");
                    t.parent = e.parent();
                    e.data("menu", t)
                }
                if (e.parent().hasClass(s + "_collapsed")) {
                    t.arrow.html(o.openedSymbol);
                    t.parent.removeClass(s + "_collapsed");
                    p(t.ul, true)
                } else {
                    t.arrow.html(o.closedSymbol);
                    t.parent.addClass(s + "_collapsed");
                    p(t.ul, true)
                }
            }

            function p(e, t) {
                var n = v(e);
                var r = 0;
                if (t) r = o.duration;
                if (e.hasClass(s + "_hidden")) {
                    e.removeClass(s + "_hidden");
                    e.slideDown(r, o.easingOpen);
                    e.attr("aria-hidden", "false");
                    n.attr("tabindex", "0");
                    d(e, false)
                } else {
                    e.addClass(s + "_hidden");
                    e.slideUp(r, o.easingClose, function () {
                        e.attr("aria-hidden", "true");
                        n.attr("tabindex", "-1");
                        d(e, true);
                        e.hide()
                    })
                }
            }

            function d(t, n) {
                var r = t.children("li").children("ul").not("." + s + "_hidden");
                if (!n) {
                    r.each(function () {
                        var t = e(this);
                        t.attr("aria-hidden", "false");
                        var r = v(t);
                        r.attr("tabindex", "0");
                        d(t, n)
                    })
                } else {
                    r.each(function () {
                        var t = e(this);
                        t.attr("aria-hidden", "true");
                        var r = v(t);
                        r.attr("tabindex", "-1");
                        d(t, n)
                    })
                }
            }

            function v(e) {
                var t = e.data("menu");
                if (!t) {
                    t = {};
                    var n = e.children("li");
                    var r = n.children("a");
                    t.links = r.add(n.children("." + s + "_item"));
                    e.data("menu", t)
                }
                return t.links
            }

            function m(t) {
                if (!t) {
                    e("." + s + "_item, ." + s + "_btn").css("outline", "none")
                } else {
                    e("." + s + "_item, ." + s + "_btn").css("outline", "")
                }
            }

            var i = e(this);
            var o = e.extend({}, r, n);
            if (o.duplicate) {
                var u = i.clone();
                u.removeAttr("id");
                u.find("*").each(function (t, n) {
                    e(n).removeAttr("id")
                })
            } else var u = i;
            var a = s + "_icon";
            if (o.label == "") {
                a += " " + s + "_no-text"
            }
            if (o.parentTag == "a") {
                o.parentTag = 'a href="#"'
            }
            u.attr("class", s + "_nav");
            var f = e('<div class="' + s + '_menu"></div>');
            var l = e("<" + o.parentTag + ' aria-haspopup="true" tabindex="0" class="' + s + '_btn"><span class="' + s + '_menutxt">' + o.label + '</span><span class="' + a + '"><span class="' + s + '_icon-bar"></span><span class="' + s + '_icon-bar"></span><span class="' + s + '_icon-bar"></span></span></a>');
            e(f).append(l);
            e(o.prependTo).prepend(f);
            f.append(u);
            var c = u.find("li");
            e(c).each(function () {
                var t = e(this);
                data = {};
                data.children = t.children("ul").attr("role", "menu");
                t.data("menu", data);
                if (data.children.length > 0) {
                    var n = t.contents();
                    var r = [];
                    e(n).each(function () {
                        if (!e(this).is("ul")) {
                            r.push(this)
                        } else {
                            return false
                        }
                    });
                    var i = e(r).wrapAll("<" + o.parentTag + ' role="menuitem" aria-haspopup="true" tabindex="-1" class="' + s + '_item"/>').parent();
                    t.addClass(s + "_collapsed");
                    t.addClass(s + "_parent");
                    e(r).last().after('<span class="' + s + '_arrow">' + o.closedSymbol + "</span>")
                } else if (t.children().length == 0) {
                    t.addClass(s + "_txtnode")
                }
                t.children("a").attr("role", "menuitem").click(function () {
                    if (o.closeOnClick) e(l).click()
                })
            });
            e(c).each(function () {
                var t = e(this).data("menu");
                p(t.children, false)
            });
            p(u, false);
            u.attr("role", "menu");
            e(t).mousedown(function () {
                m(false)
            });
            e(t).keyup(function () {
                m(true)
            });
            e(l).click(function (e) {
                e.preventDefault();
                p(u, true)
            });
            u.on("click", "." + s + "_item", function (t) {
                t.preventDefault();
                h(e(this))
            });
            e(l).keydown(function (e) {
                var t = e || event;
                if (t.keyCode == 13) {
                    e.preventDefault();
                    p(u, true)
                }
            });
            u.on("keydown", "." + s + "_item", function (t) {
                var n = t || event;
                if (n.keyCode == 13) {
                    t.preventDefault();
                    h(e(t.target))
                }
            });
            if (o.allowParentLinks) {
                e("." + s + "_item a").click(function (e) {
                    e.stopImmediatePropagation()
                })
            }
        })
    }
})(jQuery, document, window)