;; Device Registration Contract
;; Records details of custom gaming interfaces

;; Data Variables
(define-data-var device-counter uint u0)

;; Data Maps
(define-map devices
  { device-id: uint }
  {
    registrar: principal,
    name: (string-utf8 100),
    category: (string-utf8 50),
    description: (string-utf8 500),
    accessibility-features: (list 10 (string-utf8 100)),
    input-methods: (list 10 (string-utf8 50)),
    output-methods: (list 10 (string-utf8 50)),
    timestamp: uint
  }
)

(define-map category-devices
  { category: (string-utf8 50) }
  { device-ids: (list 100 uint) }
)

(define-map user-devices
  { user: principal }
  { device-ids: (list 100 uint) }
)

;; Register a new adaptive gaming device
(define-public (register-device
    (name (string-utf8 100))
    (category (string-utf8 50))
    (description (string-utf8 500))
    (accessibility-features (list 10 (string-utf8 100)))
    (input-methods (list 10 (string-utf8 50)))
    (output-methods (list 10 (string-utf8 50))))
  (let ((device-id (var-get device-counter)))
    (begin
      ;; Store the device information
      (map-set devices
        { device-id: device-id }
        {
          registrar: tx-sender,
          name: name,
          category: category,
          description: description,
          accessibility-features: accessibility-features,
          input-methods: input-methods,
          output-methods: output-methods,
          timestamp: block-height
        }
      )

      ;; Update category-to-device mapping
      (let ((category-list (default-to { device-ids: (list) } (map-get? category-devices { category: category }))))
        (map-set category-devices
          { category: category }
          { device-ids: (unwrap-panic (as-max-len? (append (get device-ids category-list) device-id) u100)) }
        )
      )

      ;; Update user-to-device mapping
      (let ((user-list (default-to { device-ids: (list) } (map-get? user-devices { user: tx-sender }))))
        (map-set user-devices
          { user: tx-sender }
          { device-ids: (unwrap-panic (as-max-len? (append (get device-ids user-list) device-id) u100)) }
        )
      )

      ;; Increment counter and return device ID
      (var-set device-counter (+ device-id u1))
      (ok device-id)
    )
  )
)

;; Update device information
(define-public (update-device
    (device-id uint)
    (description (string-utf8 500))
    (accessibility-features (list 10 (string-utf8 100)))
    (input-methods (list 10 (string-utf8 50)))
    (output-methods (list 10 (string-utf8 50))))
  (let ((device-data (map-get? devices { device-id: device-id })))
    (if (and (is-some device-data) (is-eq tx-sender (get registrar (unwrap-panic device-data))))
      (begin
        (map-set devices
          { device-id: device-id }
          (merge (unwrap-panic device-data) {
            description: description,
            accessibility-features: accessibility-features,
            input-methods: input-methods,
            output-methods: output-methods,
            timestamp: block-height
          })
        )
        (ok true)
      )
      (err u1) ;; Simple error code
    )
  )
)

;; Get device details by ID
(define-read-only (get-device (device-id uint))
  (map-get? devices { device-id: device-id })
)

;; Get all devices in a category
(define-read-only (get-devices-by-category (category (string-utf8 50)))
  (default-to { device-ids: (list) } (map-get? category-devices { category: category }))
)

;; Get all devices registered by a user
(define-read-only (get-user-devices (user principal))
  (default-to { device-ids: (list) } (map-get? user-devices { user: user }))
)

;; Get the total number of registered devices
(define-read-only (get-device-count)
  (var-get device-counter)
)

