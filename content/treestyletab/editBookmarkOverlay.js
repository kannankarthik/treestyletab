var TreeStyleEditableBookmarkService = {

	instantApply : false,

	get parentRow()
	{
		return document.getElementById('treestyletab-parent-row');
	},

	get menulist()
	{
		return document.getElementById('treestyletab-parent-menulist');
	},
	get popup()
	{
		return document.getElementById('treestyletab-parent-popup');
	},

	get separator()
	{
		return document.getElementById('treestyletab-parent-blank-item-separator');
	},
	get blankItem()
	{
		return document.getElementById('treestyletab-parent-blank-item');
	},

	init : function()
	{
		if (!('gEditItemOverlay' in window) || this.initialized) return;

		var container = document.getElementById('editBookmarkPanelGrid');
		if (!container) return;

		container = container.getElementsByTagName('rows')[0];

/* to be inserted to the container...
	<row align="center">
		<label value=" (bookmarkProperty.parent.label) "
			control="treestyletab-parent-menulist"/>
		<menulist id="treestyletab-parent-menulist"
			flex="1"
			oncommand="TreeStyleEditableBookmarkService.onParentChange();">
			<menupopup id="treestyletab-parent-popup">
				<menuseparator id="treestyletab-parent-blank-item-separator"/>
				<menuitem id="treestyletab-parent-blank-item"
					label=" (bookmarkProperty.parent.blank.label) "
					value=""/>
			</menupopup>
		</menulist>
	</row>
*/

		eval('gEditItemOverlay._showHideRows = '+gEditItemOverlay._showHideRows.toSource().replace(
			'this._element("keywordRow").collapsed',
			'TreeStyleEditableBookmarkService.parentRow.collapsed = $&'
		));

		eval('gEditItemOverlay.initPanel = '+gEditItemOverlay.initPanel.toSource().replace(
			'if (this._itemType == Ci.nsINavBookmarksService.TYPE_BOOKMARK) {',
			'$& TreeStyleEditableBookmarkService.initParentMenuList();'
		));

		eval('gEditItemOverlay.onItemMoved = '+gEditItemOverlay.onItemMoved.toSource().replace(
			'{',
			'$& if (aNewParent == this._getFolderIdFromMenuList()) TreeStyleEditableBookmarkService.initParentMenuList();'
		));

		// Bookmarks Property dialog
		if ('BookmarkPropertiesPanel' in window) {
			eval('BookmarkPropertiesPanel._endBatch = '+BookmarkPropertiesPanel._endBatch.toSource().replace(
				'PlacesUIUtils.ptm.endBatch();',
				'$& TreeStyleEditableBookmarkService.saveParentFor(this._itemId);'
			));
		}

		// Places Organizer (Library)
		if ('PlacesOrganizer' in window) {
			this.instantApply = true;
		}

		this.initialized = true;
	},
	initialized : false,

	initParentMenuList : function()
	{
		var id = gEditItemOverlay.itemId;

		var popup = this.popup;
		var range = document.createRange();
		range.selectNodeContents(popup);
		range.setEndBefore(this.separator);
		range.deleteContents();
		var fragment = this._createSiblingsFragment(id);
		var siblings = Array.slice(fragment.childNodes)
						.map(function(aItem) {
							return parseInt(aItem.getAttribute('value'));
						});
		range.insertNode(fragment);
		range.detach();

		var selected = popup.getElementsByAttribute('selected', 'true')[0];
		this.menulist.value = (selected || this.blankItem).value;
	},
	_createSiblingsFragment : function(aCurrentItem)
	{
		var items = this._getItemsInFolder(PlacesUtils.bookmarks.getFolderIdForItem(aCurrentItem));
		var treeStructure = TreeStyleTabBookmarksService.getTreeStructureFromItems(items);

		var selected = treeStructure[items.indexOf(aCurrentItem)];
		if (selected > -1) selected = items[selected];

		var fragment = document.createDocumentFragment();
		var afterCurrent = false;
		items.forEach(function(aId, aIndex) {
			let item = document.createElement('menuitem');
			item.setAttribute('label', PlacesUtils.bookmarks.getItemTitle(aId));
			item.setAttribute('value', aId);

			let parent = aIndex;
			let nest = 0;
			while ((parent = treeStructure[parent]) != -1)
			{
				nest++;
			}
			if (nest) item.setAttribute('style', 'padding-left:'+nest+'em');

			if (aId == aCurrentItem) afterCurrent = true;
			if (afterCurrent) item.setAttribute('disabled', true);
			if (aId == selected && !afterCurrent) item.setAttribute('selected', true);

			fragment.appendChild(item);
		});
		return fragment;
	},
	_getItemsInFolder : function(aId)
	{
		var count = 0;
		var items = [];
		var item;
		try {
			while((item = PlacesUtils.bookmarks.getIdForItemAt(aId, count++)) != -1)
			{
				try {
					let uri = PlacesUtils.bookmarks.getBookmarkURI(item);
					if (uri.spec.indexOf('place:') != 0)
						items.push(item);
				}
				catch(e) {
					// this is not a normal bookmark.
				}
			}
		}
		catch(e) {
		}
		return items;
	},

	saveParentFor : function(aId)
	{
		PlacesUtils.setAnnotationsForItem(aId, [{
			name    : TreeStyleTabService.kPARENT,
			value   : parseInt(this.menulist.value || -1),
			expires : PlacesUtils.annotations.EXPIRE_NEVER
		}]);
	},

	onParentChange : function()
	{
		if (!this.instantApply) return;
		this.saveParentFor(gEditItemOverlay.itemId);
	},

	handleEvent : function(aEvent)
	{
		switch (aEvent.type)
		{
			case 'DOMContentLoaded':
				window.removeEventListener('DOMContentLoaded', this, false);
				this.init();
				break;
		}
	}

};

window.addEventListener('DOMContentLoaded', TreeStyleEditableBookmarkService, false);