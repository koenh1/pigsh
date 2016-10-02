/*
 * Copyright (C) 2012-2014 by Coriolis Technologies Pvt Ltd.
 * This program is free software - see the file COPYING for license details.
 */

/*
 * Media UIs provide display and edit functionality for blobs with a
 * given mime type.
 *
 * This file contains default implementations of a few common media types.
 */

var TextHtmlUI = {
    display: function(item, pterm, cb) {
        to('text', item, {}, ef(cb, function(res) {
            if (item.href) {
                res = res.replace(/(<head[^>]*>)/i, '$1<base href="' +
                item.href + '" />');
            }
            var iframe = document.createElement('iframe'),
                maxwidth = pterm.div.width(),
                height = $(window).height() * 0.8,
                div = $('<div class="thui-browser"/>');
            iframe.setAttribute('style', sprintf("width:%dpx; height:%dpx",
                maxwidth, height));
            iframe.setAttribute("sandbox", "");
            iframe.setAttribute("srcdoc", res);
            var navbar = '<div class="pterm-editor-navbar pt2">' +
            '<button class="pe-button thui-close pt2">Close</button>' +
            '<div class="pe-status"></div>' +
            '</div>';
            div.append(navbar);
            div.append($(iframe));
            return cb(null, div[0]);
        }));
    },
    init: function() {
        $(document).on("click.thui", ".thui-close", function() {
            $(this).closest(".thui-browser").remove();
            $(document).click();
        });
    }
};

var ImageUI = {
    display: function(item, pterm, cb) {
        to('canvas', item, {}, cb);
    }
};

var TextPlainUI = {
    display: function(item, pterm, cb) {
        to('text', item, {}, cb);
    }
};

var OctetStreamUI = {
    display: function(item, pterm, cb) {
        to('text', item, {}, cb);
    }
};

var PdfUI = {
    display: function(item, pterm, cb) {
        var self = this,
            template = '<div class="pdfui-browser"><div class="pt2">' + 
    '<button class="pdfui-close pt2">Close</button></div>' +
    '<iframe src="' + pigshell.site.vurl +
    '/common/lib/PDF.js-0.8.1326/generic/web/viewer.html"></div>';
        to('arraybuffer', item, {}, ef(cb, function(res) {
            var widget = $(template),
                iframe = widget.find("iframe"),
                maxwidth = pterm.div.width(),
                height = $(window).height() * 0.8;

            iframe.width(maxwidth).height(height);
            iframe[0].onload = function() {
                iframe[0].contentWindow.postMessage(res, '*');
            };
            pterm.div.append(widget);
            return cb(null, null);
        }));
    },

    init: function() {
        $(document).on("click.pdfui", ".pdfui-close", function() {
            $(this).closest(".pdfui-browser").remove();
            $(document).click();
        });
    }
};

VFS.register_handler("TextHtmlUI", TextHtmlUI);
VFS.register_handler("TextPlainUI", TextPlainUI);
VFS.register_handler("ImageUI", ImageUI);
VFS.register_handler("OctetStreamUI", OctetStreamUI);
VFS.register_handler("PdfUI", PdfUI);

VFS.register_media_ui_handler("text/html", "TextHtmlUI", {});
TextHtmlUI.init();
VFS.register_media_ui_handler("text/plain", "TextPlainUI", {});
VFS.register_media_ui_handler("image", "ImageUI", {});
VFS.register_media_ui_handler("application/octet-stream", "OctetStreamUI", {});
VFS.register_media_ui_handler("application/pdf", "PdfUI", {});
PdfUI.init();
